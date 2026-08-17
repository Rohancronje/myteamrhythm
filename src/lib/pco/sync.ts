// Reusable sync core — called by the scripts, the cron route, and the webhook.
// Fetches from Planning Center and upserts into Postgres. Keeping it here (not
// just in scripts) lets the serverless cron + webhook reuse the exact same logic.

import { PcoClient, pcoConfigFromEnv, type PcoConfig } from "./client";
import { pseudonymFor } from "./pseudonym";
import {
  writeRoster,
  writeSongs,
  writeUpcoming,
  writeOneUpcoming,
  deleteUpcoming,
  type EventRow,
  type PersonRow,
  type ServiceRow,
  type SlotRow,
  type UpcomingRow,
} from "@/db/writers";

function mode<T>(xs: T[]): T | undefined {
  const c = new Map<T, number>();
  let best: T | undefined;
  let n = 0;
  for (const x of xs) {
    const k = (c.get(x) ?? 0) + 1;
    c.set(x, k);
    if (k > n) { n = k; best = x; }
  }
  return best;
}
import { nzToday } from "@/lib/time";

function daysAgoISO(days: number): string {
  const d = new Date(nzToday() + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
function daysAheadISO(days: number): string {
  const d = new Date(nzToday() + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const todayISO = () => nzToday();

// ── Bulk syncs (cron) ─────────────────────────────────────────────────────────

export async function syncRoster(weeks = 4, cfg: PcoConfig = pcoConfigFromEnv()) {
  const client = new PcoClient(cfg);
  const rows = await client.fetchScheduledSince(daysAgoISO(weeks * 7));
  const byPerson = new Map<string, { name: string; teams: string[]; roles: string[] }>();
  const seen = new Set<string>();
  const events: EventRow[] = [];
  for (const r of rows) {
    const p = byPerson.get(r.personId) ?? { name: r.personName, teams: [], roles: [] };
    p.teams.push(r.team);
    p.roles.push(r.position || "Team");
    byPerson.set(r.personId, p);
    const key = `${r.personId}|${r.planId}|${r.position || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    events.push({ pcoId: r.personId, serviceType: r.serviceType, serviceDate: r.date, planId: r.planId, status: r.status, position: r.position || "" });
  }
  const people: PersonRow[] = [...byPerson.entries()].map(([pcoId, v]) => ({
    pcoId,
    handle: pseudonymFor(pcoId),
    name: v.name,
    team: mode(v.teams) ?? "Unassigned",
    role: mode(v.roles) ?? "Team",
  }));
  await writeRoster(people, events, { window: `${weeks}w`, people: people.length, events: events.length });
  return { people: people.length, events: events.length };
}

export async function syncSongs(weeks = 4, cfg: PcoConfig = pcoConfigFromEnv()) {
  const client = new PcoClient(cfg);
  const since = daysAgoISO(weeks * 7);
  const services: ServiceRow[] = [];
  const slots: SlotRow[] = [];
  for (const [pcoId, key] of Object.entries(cfg.serviceTypeMap)) {
    const plans = await client.listPastPlans(pcoId, since);
    for (const plan of plans) {
      const [songs, members] = await Promise.all([client.planItems(pcoId, plan.id), client.planTeamMembers(pcoId, plan.id)]);
      if (!songs.length) continue;
      const lead = members.find((m) => /worship\s*lead|music director|^lead$/i.test(m.position));
      services.push({ planId: plan.id, serviceDate: plan.date, serviceType: key, leader: lead?.personName ?? null });
      songs.forEach((s, i) => slots.push({ planId: plan.id, songId: s.songId, title: s.title, author: s.author, keyName: s.key, bpm: s.bpm == null ? null : Math.round(s.bpm), position: i }));
    }
  }
  await writeSongs(services, slots, { window: `${weeks}w`, services: services.length, slots: slots.length });
  return { services: services.length, slots: slots.length };
}

export async function syncUpcoming(weeks = 6, cfg: PcoConfig = pcoConfigFromEnv()) {
  const client = new PcoClient(cfg);
  const until = daysAheadISO(weeks * 7);
  const rows: UpcomingRow[] = [];
  for (const [pcoId, key] of Object.entries(cfg.serviceTypeMap)) {
    const plans = await client.listFuturePlans(pcoId, until);
    for (const plan of plans) {
      rows.push(await buildUpcomingRow(client, pcoId, key, plan.id, plan.date, plan.title, plan.seriesTitle));
    }
  }
  await writeUpcoming(rows, { window: `${weeks}w`, services: rows.length });
  return { services: rows.length };
}

async function buildUpcomingRow(client: PcoClient, serviceTypeId: string, key: string, planId: string, date: string, title: string, seriesTitle: string): Promise<UpcomingRow> {
  const [times, members, songs] = await Promise.all([client.planTimes(serviceTypeId, planId), client.planTeamMembers(serviceTypeId, planId), client.planItems(serviceTypeId, planId)]);
  return {
    planId,
    serviceDate: date,
    serviceType: key,
    title,
    seriesTitle,
    data: {
      times,
      roster: members.filter((m) => m.personId && m.status !== "declined").map((m) => ({ pcoId: m.personId, name: m.personName, position: m.position, team: m.team, status: m.status })),
      songs: songs.map((s, i) => ({ title: s.title, key: s.key, bpm: s.bpm == null ? null : Math.round(s.bpm), position: i })),
    },
  };
}

// ── Single-plan sync (webhook) ────────────────────────────────────────────────

/** Re-sync ONE plan after a Planning Center change. Routes it to upcoming (future)
 *  or roster+songs (past) based on its date. Ignores unmapped service types. */
export async function syncOnePlan(serviceTypeId: string, planId: string, cfg: PcoConfig = pcoConfigFromEnv()): Promise<{ ok: boolean; where?: string }> {
  const key = cfg.serviceTypeMap[serviceTypeId];
  if (!key) return { ok: false }; // not one of our service types

  const client = new PcoClient(cfg);
  // Find the plan's date + titles.
  const [times, members, songs] = await Promise.all([
    client.planTimes(serviceTypeId, planId),
    client.planTeamMembers(serviceTypeId, planId),
    client.planItems(serviceTypeId, planId),
  ]);
  // Derive the date from the plan_times (first) — fall back handled by caller.
  const date = times[0]?.startsAt?.slice(0, 10) ?? "";

  if (!date || date >= todayISO()) {
    // Future (or unknown) → upcoming.
    await writeOneUpcoming({
      planId,
      serviceDate: date || todayISO(),
      serviceType: key,
      title: "",
      seriesTitle: "",
      data: {
        times,
        roster: members.filter((m) => m.personId && m.status !== "declined").map((m) => ({ pcoId: m.personId, name: m.personName, position: m.position, team: m.team, status: m.status })),
        songs: songs.map((s, i) => ({ title: s.title, key: s.key, bpm: s.bpm == null ? null : Math.round(s.bpm), position: i })),
      },
    });
    return { ok: true, where: "upcoming" };
  }

  // Past → roster + songs for this plan only.
  const people: PersonRow[] = [];
  const events: EventRow[] = [];
  const seen = new Set<string>();
  for (const m of members) {
    if (!m.personId) continue;
    people.push({ pcoId: m.personId, handle: pseudonymFor(m.personId), name: m.personName, team: m.team, role: m.position || "Team" });
    const k = `${m.personId}|${planId}|${m.position || ""}`;
    if (seen.has(k)) continue;
    seen.add(k);
    events.push({ pcoId: m.personId, serviceType: key, serviceDate: date, planId, status: m.status, position: m.position || "" });
  }
  await writeRoster(people, events);
  if (songs.length) {
    const lead = members.find((m) => /worship\s*lead|music director|^lead$/i.test(m.position));
    await writeSongs(
      [{ planId, serviceDate: date, serviceType: key, leader: lead?.personName ?? null }],
      songs.map((s, i) => ({ planId, songId: s.songId, title: s.title, author: s.author, keyName: s.key, bpm: s.bpm == null ? null : Math.round(s.bpm), position: i })),
    );
  }
  return { ok: true, where: "past" };
}

export async function removePlan(planId: string) {
  await deleteUpcoming(planId);
}

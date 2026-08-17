// DB read layer. Returns the SAME shapes the app already builds from the local
// JSON snapshots, so the data source and Song Intelligence engine work unchanged
// whether the data comes from Postgres or a snapshot file.

import { asc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { people as peopleT, servingEvents, songServices, songSlots, syncState, upcomingServices } from "./schema";

const ORG = "City Impact · NS Family Services";

export async function readRosterSnapshot() {
  const db = getDb();
  const [ppl, evs, state] = await Promise.all([
    db.select().from(peopleT),
    db.select().from(servingEvents),
    db.select().from(syncState).where(eq(syncState.key, "roster")),
  ]);

  const byPerson = new Map<string, { serviceType: string; date: string; planId: string; status: string; position: string }[]>();
  for (const e of evs) {
    const a = byPerson.get(e.pcoId) ?? [];
    a.push({ serviceType: e.serviceType, date: e.serviceDate, planId: e.planId, status: e.status, position: e.position });
    byPerson.set(e.pcoId, a);
  }

  const meta = (state[0]?.meta ?? {}) as { windowWeeks?: number };
  return {
    org: ORG,
    generatedAt: state[0]?.lastSyncedAt?.toISOString() ?? null,
    anchor: new Date().toISOString().slice(0, 10),
    windowWeeks: meta.windowWeeks ?? 26,
    people: ppl.map((p) => ({
      pcoId: p.pcoId,
      name: p.name,
      handle: p.handle,
      team: p.team,
      role: p.role,
      events: byPerson.get(p.pcoId) ?? [],
    })),
  };
}

export async function readUpcoming() {
  const rows = await getDb().select().from(upcomingServices).orderBy(asc(upcomingServices.serviceDate));
  return rows.map((r) => ({
    planId: r.planId,
    date: r.serviceDate,
    serviceType: r.serviceType,
    title: r.title ?? "",
    seriesTitle: r.seriesTitle ?? "",
    ...(r.data as { times: unknown[]; roster: unknown[]; songs: unknown[] }),
  }));
}

export async function readSongsSnapshot() {
  const db = getDb();
  const [svcs, slots, state] = await Promise.all([
    db.select().from(songServices),
    db.select().from(songSlots),
    db.select().from(syncState).where(eq(syncState.key, "songs")),
  ]);

  const byPlan = new Map<string, { songId: string; title: string; author: string; key: string; bpm: number | null }[]>();
  for (const s of [...slots].sort((a, b) => a.position - b.position)) {
    const a = byPlan.get(s.planId) ?? [];
    a.push({ songId: s.songId, title: s.title, author: s.author, key: s.keyName, bpm: s.bpm });
    byPlan.set(s.planId, a);
  }

  const meta = (state[0]?.meta ?? {}) as { windowWeeks?: number };
  return {
    generatedAt: state[0]?.lastSyncedAt?.toISOString() ?? "",
    anchor: new Date().toISOString().slice(0, 10),
    windowWeeks: meta.windowWeeks ?? 24,
    org: ORG,
    services: svcs.map((s) => ({
      planId: s.planId,
      date: s.serviceDate,
      serviceType: s.serviceType,
      leader: s.leader,
      songs: byPlan.get(s.planId) ?? [],
    })),
  };
}

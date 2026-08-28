// The coach "connect" engine. Builds a rolling 4-week connection plan for a coach's
// team(s): who to reach out to today, a contacted-% for the current cycle, and
// per-person context (last contact, last FYI note, birthday).
//
// Data source: admin-managed teams + volunteers (Planning Center is parked). Cadence:
// every member should be connected with once per 4-week cycle. "Due" = never contacted,
// or last contacted 28+ days ago. Today's list surfaces the most-overdue due people,
// capped to an even daily pace so the coach isn't handed the whole team at once.

import { daysUntilBirthday } from "./contacts";
import { getServingIndex, type ServeRef } from "./serving";
import { VERSES, weekIndex, type Verse } from "./verses";

const CYCLE_DAYS = 28;
const WORKING_DAYS = 20; // ~4 weeks of weekdays — spreads the roster into a daily pace

export interface ConnectPerson {
  id: string;
  name: string;
  initials: string;
  team: string;
  role: string;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  birthdayInDays: number | null;
  lastContacted: string | null; // ISO
  daysSince: number | null;
  due: boolean;
  contactedThisCycle: boolean;
  lastContactedBy: string | null; // display name of the coach who last reached them
  lastContactedByYou: boolean; // was that most-recent contact made by the viewer
  reachedByYouThisCycle: boolean; // did the viewer reach them at all this cycle
  lastNote: string | null;
  verse: Verse | null; // suggested verse to send this week
  // Planning Center serving context — null when the member isn't matched to a PCO
  // person; last/next are null when matched but with no history / not rostered.
  serving: { last: ServeRef | null; next: ServeRef | null } | null;
}

export interface CoachConnect {
  teamIds: string[];
  teams: string[]; // team names, for the header
  total: number;
  contactedCount: number; // reached this cycle by ANY coach on the team
  contactedPct: number;
  contactedByYouCount: number; // of those, how many the viewer reached themselves
  coachCount: number; // coaches assigned to these team(s) — >1 means shared effort
  dailyTarget: number;
  today: ConnectPerson[]; // still to reach today (shrinks as you log contacts)
  doneToday: ConnectPerson[]; // reached today — shown as completed, not back-filled
  birthdaysSoon: ConnectPerson[];
  people: ConnectPerson[];
}

interface ConnRow {
  pcoId: string;
  coachEmail: string;
  contactedAt: Date;
  note: string | null;
}

function initials(name: string): string {
  const parts = name
    .replace(/["'“”‘’][^"'“”‘’]*["'“”‘’]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  const letters = parts.map((n) => n[0]).slice(0, 2).join("");
  return (letters || name.replace(/[^\p{L}]/gu, "").charAt(0) || "?").toUpperCase();
}

async function loadConnections(memberIds: string[]): Promise<Map<string, ConnRow[]>> {
  const byPerson = new Map<string, ConnRow[]>();
  if (!process.env.DATABASE_URL || memberIds.length === 0) return byPerson;
  try {
    const { getDb } = await import("@/db");
    const { connections } = await import("@/db/schema");
    const { inArray, desc } = await import("drizzle-orm");
    const rows = await getDb()
      .select()
      .from(connections)
      .where(inArray(connections.pcoId, memberIds))
      .orderBy(desc(connections.contactedAt));
    for (const r of rows) {
      const list = byPerson.get(r.pcoId) ?? [];
      list.push({ pcoId: r.pcoId, coachEmail: r.coachEmail, contactedAt: r.contactedAt, note: r.note });
      byPerson.set(r.pcoId, list);
    }
  } catch {
    /* table may not exist yet */
  }
  return byPerson;
}

/** Resolve coach emails → display names (for "reached by …" attribution). Falls
 *  back to the email's local part when a coach account can't be found. */
async function loadCoachNames(emails: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const wanted = [...new Set(emails.filter(Boolean))];
  if (!process.env.DATABASE_URL || wanted.length === 0) return map;
  try {
    const { getDb } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { inArray } = await import("drizzle-orm");
    const rows = await getDb().select({ email: users.email, name: users.name }).from(users).where(inArray(users.email, wanted));
    for (const r of rows) map.set(r.email, r.name);
  } catch {
    /* users table may be unavailable */
  }
  return map;
}

/** Build the connection plan for one or more teams (by team id). `viewerEmail`
 *  scopes FYI notes so ONLY their author ever sees a note — never other coaches
 *  on the team, and never the admin. */
export async function getCoachConnect(teamIds: string[] | undefined, now: Date, viewerEmail?: string): Promise<CoachConnect> {
  const ids = [...new Set((teamIds ?? []).filter(Boolean))];
  const empty: CoachConnect = { teamIds: ids, teams: [], total: 0, contactedCount: 0, contactedPct: 0, contactedByYouCount: 0, coachCount: 0, dailyTarget: 1, today: [], doneToday: [], birthdaysSoon: [], people: [] };
  if (!process.env.DATABASE_URL || ids.length === 0) return empty;

  const { getDb } = await import("@/db");
  const { teams, teamMembers, teamCoaches } = await import("@/db/schema");
  const { inArray, eq, and } = await import("drizzle-orm");
  const d = getDb();

  const [teamRows, roster, coachRows] = await Promise.all([
    d.select({ id: teams.id, name: teams.name }).from(teams).where(inArray(teams.id, ids)),
    d.select().from(teamMembers).where(and(inArray(teamMembers.teamId, ids), eq(teamMembers.active, true))),
    d.select({ coachEmail: teamCoaches.coachEmail }).from(teamCoaches).where(inArray(teamCoaches.teamId, ids)),
  ]);
  const teamName = new Map(teamRows.map((t) => [t.id, t.name]));
  const coachCount = new Set(coachRows.map((c) => c.coachEmail)).size;
  const conns = await loadConnections(roster.map((m) => m.id));
  // Names of every coach who has logged a contact on this roster — for "reached by …".
  const coachNames = await loadCoachNames([...new Set([...conns.values()].flat().map((c) => c.coachEmail))]);
  const nameOf = (email: string) => coachNames.get(email) ?? email.split("@")[0];
  // Planning Center serving links (last serve / next serving), matched by name.
  const { nzToday } = await import("@/lib/time");
  const [serving, todayISO] = [await getServingIndex(), nzToday()];

  // Weekly verse suggestion — assigned by position WITHIN each team so no two
  // teammates share a verse this week; rotates every Monday. (Computed before the
  // display sorts so the assignment is stable regardless of row order.)
  const wk = weekIndex();
  const byTeam = new Map<string, string[]>();
  for (const m of roster) {
    const arr = byTeam.get(m.teamId) ?? [];
    arr.push(m.id);
    byTeam.set(m.teamId, arr);
  }
  const verseOf = new Map<string, Verse>();
  for (const memberIds of byTeam.values()) {
    memberIds.sort();
    memberIds.forEach((mid, i) => verseOf.set(mid, VERSES[(wk + i) % VERSES.length]));
  }

  const people: ConnectPerson[] = roster.map((m) => {
    const history = conns.get(m.id) ?? [];
    const last = history[0] ?? null;
    const lastContacted = last ? last.contactedAt.toISOString() : null;
    const daysSince = last ? Math.floor((now.getTime() - last.contactedAt.getTime()) / 86_400_000) : null;
    const contactedThisCycle = daysSince !== null && daysSince < CYCLE_DAYS;
    // Did the viewer personally reach this person within the current cycle?
    const reachedByYouThisCycle = !!viewerEmail && history.some(
      (h) => h.coachEmail === viewerEmail && (now.getTime() - h.contactedAt.getTime()) / 86_400_000 < CYCLE_DAYS,
    );
    return {
      id: m.id,
      name: m.name,
      initials: initials(m.name),
      team: teamName.get(m.teamId) ?? "",
      role: m.role ?? "",
      email: m.email,
      phone: m.phone,
      birthday: m.birthday,
      birthdayInDays: daysUntilBirthday(m.birthday, now),
      lastContacted,
      daysSince,
      due: !contactedThisCycle,
      contactedThisCycle,
      lastContactedBy: last ? nameOf(last.coachEmail) : null,
      lastContactedByYou: !!last && !!viewerEmail && last.coachEmail === viewerEmail,
      reachedByYouThisCycle,
      // A note is private to its author — surface it only to the viewer who wrote it.
      lastNote: viewerEmail ? history.find((h) => h.note && h.coachEmail === viewerEmail)?.note ?? null : null,
      verse: verseOf.get(m.id) ?? null,
      serving: (() => {
        const pcoId = serving.pcoIdFor(m.name);
        return pcoId ? { last: serving.lastServe(pcoId, todayISO), next: serving.nextServe(pcoId) } : null;
      })(),
    };
  });

  const total = people.length;
  const contactedCount = people.filter((p) => p.contactedThisCycle).length;
  const contactedPct = total ? Math.round((contactedCount / total) * 100) : 0;
  const contactedByYouCount = people.filter((p) => p.reachedByYouThisCycle).length;
  const dailyTarget = Math.max(1, Math.ceil(total / WORKING_DAYS));

  // Today's plan is a fixed daily batch (size = the pace). People already reached
  // TODAY fill part of that batch and are shown as done; the remaining slots are the
  // most-overdue due people. So logging a contact shrinks "still to reach today" and
  // marks the person done — it does NOT back-fill a fresh face into the quota.
  const doneToday = people
    .filter((p) => p.daysSince !== null && p.daysSince <= 0)
    .sort((a, b) => a.name.localeCompare(b.name));
  const due = people
    .filter((p) => p.due)
    .sort((a, b) => (b.daysSince ?? 1e9) - (a.daysSince ?? 1e9) || a.name.localeCompare(b.name));
  const remainingSlots = Math.max(0, dailyTarget - doneToday.length);
  const today = due.slice(0, remainingSlots);

  const birthdaysSoon = people
    .filter((p) => p.birthdayInDays !== null && p.birthdayInDays <= 7)
    .sort((a, b) => (a.birthdayInDays ?? 99) - (b.birthdayInDays ?? 99));

  // Full roster: due first, then by soonest-due.
  people.sort((a, b) => Number(b.due) - Number(a.due) || (b.daysSince ?? 1e9) - (a.daysSince ?? 1e9) || a.name.localeCompare(b.name));

  return { teamIds: ids, teams: teamRows.map((t) => t.name), total, contactedCount, contactedPct, contactedByYouCount, coachCount, dailyTarget, today, doneToday, birthdaysSoon, people };
}

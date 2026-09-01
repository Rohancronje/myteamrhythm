// Admin CRUD for the volunteer connection platform: teams, their volunteers, and
// coach assignments. This is the primary data source now (Planning Center parked).
// Reads are fresh (admin surface, low traffic) so edits show immediately.

import { nzToday, nzDateOf } from "@/lib/time";

export interface MemberRow {
  id: string;
  teamId: string;
  name: string;
  email: string | null;
  phone: string | null;
  birthday: string | null; // YYYY-MM-DD
  role: string | null;
}
export interface CoachRef {
  email: string;
  name: string;
}
export interface TeamSummary {
  id: string;
  name: string;
  campus: string | null;
  pcoTeam: string | null;
  memberCount: number;
  coaches: CoachRef[];
  contactedPct: number;
}
export interface TeamDetail {
  id: string;
  name: string;
  campus: string | null;
  pcoTeam: string | null;
  members: MemberRow[];
  coaches: CoachRef[];
}
export interface PcoTeamOption {
  team: string; // Planning Center team name (people.team)
  count: number; // people currently on it
}
export interface PcoSyncResult {
  ok: boolean;
  error?: string;
  pcoTeam?: string;
  added?: number;
  removed?: number;
  kept?: number;
}

/** Normalise a name for matching Connect members to PCO people (drop nicknames /
 *  quotes / punctuation, lowercase). Mirrors the serving-link matcher. */
function normName(name: string): string {
  return name
    .replace(/["'“”‘’][^"'“”‘’]*["'“”‘’]/g, " ")
    .replace(/\(([^)]*)\)/g, " ")
    .replace(/[^\p{L}\s]/gu, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}
export interface MemberInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  birthday?: string | null;
  role?: string | null;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/** Coerce many date shapes to YYYY-MM-DD, else null. Handles ISO, D/M/Y & M/D/Y,
 *  Excel date serials, and month-name formats ("15 Aug 1990", "August 15"). A
 *  missing year is stored as 1900 (only month/day matter for birthdays). */
export function normalizeBirthday(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const s = String(raw).trim();
  if (!s) return null;

  // ISO (possibly with a time component).
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // Excel serial date (a bare number, ~1954–2064).
  if (/^\d{4,5}(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (n > 20000 && n < 60000) {
      const dt = new Date(Math.round((n - 25569) * 86_400_000));
      return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
    }
  }

  // Numeric D/M/Y or M/D/Y (tolerant).
  const dmy = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/);
  if (dmy) {
    let [, d, m, y] = dmy;
    if (Number(m) > 12 && Number(d) <= 12) [d, m] = [m, d];
    const yr = y.length === 2 ? `19${y}` : y;
    const dd = d.padStart(2, "0"), mm = m.padStart(2, "0");
    if (Number(mm) >= 1 && Number(mm) <= 12 && Number(dd) >= 1 && Number(dd) <= 31) return `${yr}-${mm}-${dd}`;
  }

  // Month-name formats: "15 Aug", "Aug 15 1990", "August 15, 1990", "15 August 1990".
  const lower = s.toLowerCase();
  let month = 0;
  for (const [name, num] of Object.entries(MONTHS)) {
    if (new RegExp(`\\b${name}\\b`).test(lower)) { month = num; break; }
  }
  if (month) {
    const nums = lower.replace(/[^0-9\s]/g, " ").split(/\s+/).filter(Boolean).map(Number);
    const day = nums.find((n) => n >= 1 && n <= 31);
    const year = nums.find((n) => n >= 1900 && n <= 2100);
    if (day) return `${year ?? 1900}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return null;
}

function clean(v: string | null | undefined): string | null {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

async function db() {
  const { getDb } = await import("@/db");
  return getDb();
}

export interface CoachCandidate {
  name: string;
  email: string;
  phone: string | null;
  teams: string[]; // teams they're already a volunteer on (for context)
}

/** Existing volunteers who could be made coaches: active team members with an email
 *  who don't already have a login. Deduped by email (a person on several teams shows
 *  once, with all their teams listed). Powers the "assign an existing person" picker. */
export async function getCoachCandidates(): Promise<CoachCandidate[]> {
  if (!process.env.DATABASE_URL) return [];
  const { teamMembers, teams, users } = await import("@/db/schema");
  const { eq, and, isNotNull } = await import("drizzle-orm");
  const d = await db();

  const [members, teamRows, userRows] = await Promise.all([
    d.select({ name: teamMembers.name, email: teamMembers.email, phone: teamMembers.phone, teamId: teamMembers.teamId })
      .from(teamMembers).where(and(eq(teamMembers.active, true), isNotNull(teamMembers.email))),
    d.select({ id: teams.id, name: teams.name }).from(teams).where(eq(teams.archived, false)),
    d.select({ email: users.email }).from(users),
  ]);

  const teamName = new Map(teamRows.map((t) => [t.id, t.name]));
  const hasAccount = new Set(userRows.map((u) => u.email.toLowerCase()));
  const byEmail = new Map<string, CoachCandidate>();
  for (const m of members) {
    const email = (m.email ?? "").trim().toLowerCase();
    if (!email || hasAccount.has(email)) continue; // already a login — not a candidate
    const c = byEmail.get(email) ?? { name: m.name, email, phone: m.phone, teams: [] };
    const tn = teamName.get(m.teamId);
    if (tn && !c.teams.includes(tn)) c.teams.push(tn);
    if (!c.phone && m.phone) c.phone = m.phone;
    byEmail.set(email, c);
  }
  return [...byEmail.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** True if the coach is assigned to a team whose name marks it as worship — used to
 *  show them the NS Worship Team's Songs Insights. Admins see it regardless. */
export async function isWorshipCoach(email: string): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    const { teams, teamCoaches } = await import("@/db/schema");
    const { eq, and, ilike } = await import("drizzle-orm");
    const rows = await (await db())
      .select({ id: teams.id })
      .from(teamCoaches)
      .innerJoin(teams, eq(teams.id, teamCoaches.teamId))
      .where(and(eq(teamCoaches.coachEmail, email.toLowerCase()), ilike(teams.name, "%worship%")));
    return rows.length > 0;
  } catch {
    return false;
  }
}

/** Every coach account (for the assignment picker). */
export async function getAllCoaches(): Promise<CoachRef[]> {
  if (!process.env.DATABASE_URL) return [];
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const rows = await (await db()).select({ email: users.email, name: users.name }).from(users).where(eq(users.role, "coach"));
  return rows.map((r) => ({ email: r.email, name: r.name }));
}

/** Distinct Planning Center teams (from the synced roster) an admin can link a
 *  Connect team to, so member sync knows which PCO team to mirror. */
export async function getPcoTeams(): Promise<PcoTeamOption[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { people } = await import("@/db/schema");
    const { sql, isNotNull } = await import("drizzle-orm");
    const rows = await (await db())
      .select({ team: people.team, count: sql<number>`count(*)::int` })
      .from(people)
      .where(isNotNull(people.team))
      .groupBy(people.team);
    return rows
      .filter((r) => r.team && r.team.trim())
      .map((r) => ({ team: r.team, count: Number(r.count) }))
      .sort((a, b) => a.team.localeCompare(b.team));
  } catch {
    return [];
  }
}

/** Reconcile a Connect team's volunteers against its linked Planning Center team:
 *  add PCO people who aren't on it, deactivate members no longer on the PCO team.
 *  Matching is by normalised name. If `pcoTeam` is passed, (re)link it first. */
export async function syncTeamWithPco(teamId: string, pcoTeam?: string): Promise<PcoSyncResult> {
  if (!process.env.DATABASE_URL) return { ok: false, error: "No database configured." };
  const { teams, teamMembers, people } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const d = await db();

  if (pcoTeam !== undefined) await d.update(teams).set({ pcoTeam: pcoTeam || null }).where(eq(teams.id, teamId));
  const [team] = await d.select().from(teams).where(eq(teams.id, teamId));
  if (!team) return { ok: false, error: "Team not found." };
  if (!team.pcoTeam) return { ok: false, error: "Link a Planning Center team first." };

  const [pcoPeople, current] = await Promise.all([
    d.select({ name: people.name }).from(people).where(eq(people.team, team.pcoTeam)),
    d.select().from(teamMembers).where(eq(teamMembers.teamId, teamId)),
  ]);

  const pcoByKey = new Map<string, string>();
  for (const p of pcoPeople) { const k = normName(p.name); if (k) pcoByKey.set(k, p.name); }
  const currentByKey = new Map<string, (typeof current)[number]>();
  for (const m of current) currentByKey.set(normName(m.name), m);

  let added = 0, removed = 0, kept = 0;
  const toInsert: (typeof teamMembers.$inferInsert)[] = [];
  for (const [key, name] of pcoByKey) {
    const ex = currentByKey.get(key);
    if (!ex) { toInsert.push({ teamId, name, active: true }); added++; }
    else { if (!ex.active) await d.update(teamMembers).set({ active: true }).where(eq(teamMembers.id, ex.id)); kept++; }
  }
  if (toInsert.length) await d.insert(teamMembers).values(toInsert);
  for (const m of current) {
    if (m.active && !pcoByKey.has(normName(m.name))) {
      await d.update(teamMembers).set({ active: false }).where(eq(teamMembers.id, m.id));
      removed++;
    }
  }
  return { ok: true, pcoTeam: team.pcoTeam, added, removed, kept };
}

/** All non-archived teams with counts, coaches, and this-cycle contacted-%. */
export async function listTeams(): Promise<TeamSummary[]> {
  if (!process.env.DATABASE_URL) return [];
  const { teams, teamMembers, teamCoaches, connections, users } = await import("@/db/schema");
  const { eq, gte } = await import("drizzle-orm");
  const d = await db();

  const [teamRows, memberRows, coachRows, userRows] = await Promise.all([
    d.select().from(teams).where(eq(teams.archived, false)),
    d.select({ id: teamMembers.id, teamId: teamMembers.teamId }).from(teamMembers).where(eq(teamMembers.active, true)),
    d.select().from(teamCoaches),
    d.select({ email: users.email, name: users.name }).from(users),
  ]);

  // "This cycle" = this calendar month (NZ). Over-fetch around the UTC month edge, then
  // filter by NZ date so the reset lines up with the Connect page across DST.
  const monthStart = nzToday().slice(0, 7) + "-01";
  const fetchSince = new Date(Date.parse(monthStart + "T00:00:00Z") - 2 * 86_400_000);
  const conns = await d.select({ pcoId: connections.pcoId, at: connections.contactedAt }).from(connections).where(gte(connections.contactedAt, fetchSince));
  const contactedIds = new Set(conns.filter((c) => nzDateOf(c.at.toISOString()) >= monthStart).map((c) => c.pcoId));
  const nameByEmail = new Map(userRows.map((u) => [u.email, u.name]));

  return teamRows
    .map((t): TeamSummary => {
      const members = memberRows.filter((m) => m.teamId === t.id);
      const contacted = members.filter((m) => contactedIds.has(m.id)).length;
      const coaches = coachRows
        .filter((c) => c.teamId === t.id)
        .map((c) => ({ email: c.coachEmail, name: nameByEmail.get(c.coachEmail) ?? c.coachEmail }));
      return {
        id: t.id,
        name: t.name,
        campus: t.campus,
        pcoTeam: t.pcoTeam,
        memberCount: members.length,
        coaches,
        contactedPct: members.length ? Math.round((contacted / members.length) * 100) : 0,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Ids of every non-archived team (for the admin "All people" view). */
export async function getAllTeamIds(): Promise<string[]> {
  if (!process.env.DATABASE_URL) return [];
  const { teams } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const rows = await (await db()).select({ id: teams.id }).from(teams).where(eq(teams.archived, false));
  return rows.map((r) => r.id);
}

/** One team with its members and assigned coaches, or null. */
export async function getTeamById(id: string): Promise<TeamDetail | null> {
  if (!process.env.DATABASE_URL) return null;
  const { teams, teamMembers, teamCoaches, users } = await import("@/db/schema");
  const { eq, and } = await import("drizzle-orm");
  const d = await db();
  const [team] = await d.select().from(teams).where(eq(teams.id, id));
  if (!team) return null;

  const [members, coachRows] = await Promise.all([
    d.select().from(teamMembers).where(and(eq(teamMembers.teamId, id), eq(teamMembers.active, true))),
    d.select({ email: teamCoaches.coachEmail, name: users.name }).from(teamCoaches)
      .leftJoin(users, eq(users.email, teamCoaches.coachEmail))
      .where(eq(teamCoaches.teamId, id)),
  ]);

  return {
    id: team.id,
    name: team.name,
    campus: team.campus,
    pcoTeam: team.pcoTeam,
    members: members
      .map((m): MemberRow => ({ id: m.id, teamId: m.teamId, name: m.name, email: m.email, phone: m.phone, birthday: m.birthday, role: m.role }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    coaches: coachRows.map((c) => ({ email: c.email, name: c.name ?? c.email })),
  };
}

/** Create a team and (optionally) assign coaches. Returns the new team id. */
export async function createTeam(input: { name: string; campus?: string | null; pcoTeam?: string | null; coachEmails?: string[]; createdBy?: string }): Promise<string> {
  const { teams, teamCoaches } = await import("@/db/schema");
  const d = await db();
  const [row] = await d.insert(teams).values({ name: input.name.trim(), campus: clean(input.campus), pcoTeam: clean(input.pcoTeam), createdBy: input.createdBy ?? null }).returning({ id: teams.id });
  const emails = [...new Set((input.coachEmails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (emails.length) await d.insert(teamCoaches).values(emails.map((coachEmail) => ({ teamId: row.id, coachEmail })));
  return row.id;
}

export async function updateTeam(id: string, fields: { name?: string; campus?: string | null; pcoTeam?: string | null }): Promise<void> {
  const { teams } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const patch: Record<string, unknown> = {};
  if (fields.name !== undefined) patch.name = fields.name.trim();
  if (fields.campus !== undefined) patch.campus = clean(fields.campus);
  if (fields.pcoTeam !== undefined) patch.pcoTeam = clean(fields.pcoTeam);
  if (Object.keys(patch).length) await (await db()).update(teams).set(patch).where(eq(teams.id, id));
}

export async function archiveTeam(id: string): Promise<void> {
  const { teams } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  await (await db()).update(teams).set({ archived: true }).where(eq(teams.id, id));
}

/** Replace a team's coach set with `emails`. */
export async function setTeamCoaches(teamId: string, emails: string[]): Promise<void> {
  const { teamCoaches } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const d = await db();
  const clean = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  await d.delete(teamCoaches).where(eq(teamCoaches.teamId, teamId));
  if (clean.length) await d.insert(teamCoaches).values(clean.map((coachEmail) => ({ teamId, coachEmail })));
}

/** Bulk add volunteers to a team (manual add or import). Returns count added. */
export async function addMembers(teamId: string, rows: MemberInput[], createdBy?: string): Promise<{ added: number; updated: number }> {
  const { teamMembers } = await import("@/db/schema");
  const { eq, and } = await import("drizzle-orm");
  const d = await db();

  const existing = await d.select().from(teamMembers).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.active, true)));
  const byEmail = new Map(existing.filter((e) => e.email).map((e) => [e.email!.toLowerCase(), e]));
  const byName = new Map(existing.map((e) => [e.name.trim().toLowerCase(), e]));

  const toInsert: (typeof teamMembers.$inferInsert)[] = [];
  let updated = 0;

  for (const r of rows) {
    const name = (r.name ?? "").trim();
    if (!name) continue;
    const email = clean(r.email);
    const phone = clean(r.phone);
    const birthday = normalizeBirthday(r.birthday);
    const role = clean(r.role);
    const match = (email && byEmail.get(email.toLowerCase())) || byName.get(name.toLowerCase());

    if (match) {
      // Update existing — only non-empty incoming fields overwrite (blank never erases).
      const patch: Record<string, unknown> = { name, updatedAt: new Date() };
      if (email !== null) patch.email = email;
      if (phone !== null) patch.phone = phone;
      if (birthday !== null) patch.birthday = birthday;
      if (role !== null) patch.role = role;
      await d.update(teamMembers).set(patch).where(eq(teamMembers.id, match.id));
      updated++;
    } else {
      toInsert.push({ teamId, name, email, phone, birthday, role, createdBy: createdBy ?? null });
    }
  }

  if (toInsert.length) await d.insert(teamMembers).values(toInsert);
  return { added: toInsert.length, updated };
}

export async function updateMember(id: string, fields: Partial<MemberInput>): Promise<void> {
  const { teamMembers } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (fields.name !== undefined) patch.name = fields.name.trim();
  if (fields.email !== undefined) patch.email = clean(fields.email);
  if (fields.phone !== undefined) patch.phone = clean(fields.phone);
  if (fields.birthday !== undefined) patch.birthday = normalizeBirthday(fields.birthday);
  if (fields.role !== undefined) patch.role = clean(fields.role);
  await (await db()).update(teamMembers).set(patch).where(eq(teamMembers.id, id));
}

export async function removeMember(id: string): Promise<void> {
  const { teamMembers } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  await (await db()).delete(teamMembers).where(eq(teamMembers.id, id));
}

/** The team id a member belongs to (for coach-ownership checks). */
export async function teamIdOfMember(memberId: string): Promise<string | null> {
  if (!process.env.DATABASE_URL) return null;
  const { teamMembers } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const [row] = await (await db()).select({ teamId: teamMembers.teamId }).from(teamMembers).where(eq(teamMembers.id, memberId));
  return row?.teamId ?? null;
}

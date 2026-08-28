// Admin CRUD for the volunteer connection platform: teams, their volunteers, and
// coach assignments. This is the primary data source now (Planning Center parked).
// Reads are fresh (admin surface, low traffic) so edits show immediately.

const CYCLE_DAYS = 28;

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
  memberCount: number;
  coaches: CoachRef[];
  contactedPct: number;
}
export interface TeamDetail {
  id: string;
  name: string;
  campus: string | null;
  members: MemberRow[];
  coaches: CoachRef[];
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

/** Every coach account (for the assignment picker). */
export async function getAllCoaches(): Promise<CoachRef[]> {
  if (!process.env.DATABASE_URL) return [];
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const rows = await (await db()).select({ email: users.email, name: users.name }).from(users).where(eq(users.role, "coach"));
  return rows.map((r) => ({ email: r.email, name: r.name }));
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

  const cutoff = new Date(Date.now() - CYCLE_DAYS * 86_400_000);
  const conns = await d.select({ pcoId: connections.pcoId }).from(connections).where(gte(connections.contactedAt, cutoff));
  const contactedIds = new Set(conns.map((c) => c.pcoId));
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
    members: members
      .map((m): MemberRow => ({ id: m.id, teamId: m.teamId, name: m.name, email: m.email, phone: m.phone, birthday: m.birthday, role: m.role }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    coaches: coachRows.map((c) => ({ email: c.email, name: c.name ?? c.email })),
  };
}

/** Create a team and (optionally) assign coaches. Returns the new team id. */
export async function createTeam(input: { name: string; campus?: string | null; coachEmails?: string[]; createdBy?: string }): Promise<string> {
  const { teams, teamCoaches } = await import("@/db/schema");
  const d = await db();
  const [row] = await d.insert(teams).values({ name: input.name.trim(), campus: clean(input.campus), createdBy: input.createdBy ?? null }).returning({ id: teams.id });
  const emails = [...new Set((input.coachEmails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (emails.length) await d.insert(teamCoaches).values(emails.map((coachEmail) => ({ teamId: row.id, coachEmail })));
  return row.id;
}

export async function updateTeam(id: string, fields: { name?: string; campus?: string | null }): Promise<void> {
  const { teams } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const patch: Record<string, unknown> = {};
  if (fields.name !== undefined) patch.name = fields.name.trim();
  if (fields.campus !== undefined) patch.campus = clean(fields.campus);
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

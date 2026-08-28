// Birthdays for the current month, scoped to a set of teams. Powers the Birthdays
// tab so coaches (their teams) and admins (all teams) can see who to celebrate.

import { daysUntilBirthday } from "./contacts";

export interface BirthdayPerson {
  id: string;
  name: string;
  initials: string;
  team: string;
  birthday: string; // YYYY-MM-DD
  day: number;
  dateLabel: string; // e.g. "Fri 12 Sep"
  daysUntil: number | null;
  phone: string | null;
  email: string | null;
  when: "past" | "today" | "upcoming";
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

export interface CoachBirthdayDigest {
  coachEmail: string;
  coachName: string;
  people: { name: string; team: string }[];
}

/** Today's birthdays across all teams, grouped by the coach(es) who should hear
 *  about them. Used by the morning reminder cron. */
export async function getTodaysBirthdaysByCoach(now: Date): Promise<CoachBirthdayDigest[]> {
  if (!process.env.DATABASE_URL) return [];
  const { getDb } = await import("@/db");
  const { teamMembers, teams, teamCoaches, users } = await import("@/db/schema");
  const { eq, and, isNotNull } = await import("drizzle-orm");
  const d = getDb();

  const [members, coachRows, userRows, teamRows] = await Promise.all([
    d.select().from(teamMembers).where(and(eq(teamMembers.active, true), isNotNull(teamMembers.birthday))),
    d.select().from(teamCoaches),
    d.select({ email: users.email, name: users.name }).from(users),
    d.select({ id: teams.id, name: teams.name }).from(teams).where(eq(teams.archived, false)),
  ]);

  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const teamName = new Map(teamRows.map((t) => [t.id, t.name]));
  const activeTeam = new Set(teamRows.map((t) => t.id));
  const nameByEmail = new Map(userRows.map((u) => [u.email, u.name]));

  const digest = new Map<string, CoachBirthdayDigest>();
  for (const m of members) {
    const mt = (m.birthday ?? "").match(/^\d{4}-(\d{2})-(\d{2})$/);
    if (!mt || Number(mt[1]) !== month || Number(mt[2]) !== day || !activeTeam.has(m.teamId)) continue;
    for (const c of coachRows.filter((c) => c.teamId === m.teamId)) {
      const entry = digest.get(c.coachEmail) ?? { coachEmail: c.coachEmail, coachName: nameByEmail.get(c.coachEmail) ?? c.coachEmail, people: [] };
      entry.people.push({ name: m.name, team: teamName.get(m.teamId) ?? "" });
      digest.set(c.coachEmail, entry);
    }
  }
  return [...digest.values()];
}

/** People on `teamIds` whose birthday falls in the CURRENT month, ordered by day. */
export async function getMonthBirthdays(teamIds: string[], now: Date): Promise<BirthdayPerson[]> {
  const ids = [...new Set((teamIds ?? []).filter(Boolean))];
  if (!process.env.DATABASE_URL || ids.length === 0) return [];

  const { getDb } = await import("@/db");
  const { teamMembers, teams } = await import("@/db/schema");
  const { inArray, and, eq, isNotNull } = await import("drizzle-orm");
  const d = getDb();

  const [teamRows, members] = await Promise.all([
    d.select({ id: teams.id, name: teams.name }).from(teams).where(inArray(teams.id, ids)),
    d.select().from(teamMembers).where(and(inArray(teamMembers.teamId, ids), eq(teamMembers.active, true), isNotNull(teamMembers.birthday))),
  ]);
  const teamName = new Map(teamRows.map((t) => [t.id, t.name]));

  const curMonth = now.getUTCMonth() + 1;
  const today = now.getUTCDate();
  const year = now.getUTCFullYear();
  const fmt = new Intl.DateTimeFormat("en-NZ", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

  const out: BirthdayPerson[] = [];
  for (const m of members) {
    const mt = (m.birthday ?? "").match(/^\d{4}-(\d{2})-(\d{2})$/);
    if (!mt) continue;
    const month = Number(mt[1]);
    const day = Number(mt[2]);
    if (month !== curMonth) continue;
    out.push({
      id: m.id,
      name: m.name,
      initials: initials(m.name),
      team: teamName.get(m.teamId) ?? "",
      birthday: m.birthday!,
      day,
      dateLabel: fmt.format(new Date(Date.UTC(year, month - 1, day))),
      daysUntil: daysUntilBirthday(m.birthday, now),
      phone: m.phone,
      email: m.email,
      when: day < today ? "past" : day === today ? "today" : "upcoming",
    });
  }
  return out.sort((a, b) => a.day - b.day);
}

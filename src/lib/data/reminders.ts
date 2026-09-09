// Reminders for significant dates on a volunteer. A coach adds them from the
// contact card; the morning of the date the cron emails + in-app-notifies that
// coach. Recurring reminders repeat every year (month+day match); one-offs fire
// once on the exact date. All reads are defensive (→ [] on any error) so a missing
// table pre-migration never breaks a page.

import { nzToday } from "@/lib/time";

export interface ReminderRow {
  id: string;
  memberId: string;
  title: string;
  remindOn: string; // YYYY-MM-DD
  recurring: boolean;
}

/** Reminders on one volunteer, soonest calendar date first. */
export async function listRemindersForMember(memberId: string): Promise<ReminderRow[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { getDb } = await import("@/db");
    const { reminders } = await import("@/db/schema");
    const { eq, asc } = await import("drizzle-orm");
    const rows = await getDb().select().from(reminders).where(eq(reminders.memberId, memberId)).orderBy(asc(reminders.remindOn));
    return rows.map((r) => ({ id: r.id, memberId: r.memberId, title: r.title, remindOn: r.remindOn, recurring: r.recurring }));
  } catch {
    return [];
  }
}

export async function createReminder(input: {
  memberId: string;
  coachEmail: string;
  title: string;
  remindOn: string;
  recurring: boolean;
}): Promise<ReminderRow> {
  const { getDb } = await import("@/db");
  const { reminders } = await import("@/db/schema");
  const [r] = await getDb().insert(reminders).values(input).returning();
  return { id: r.id, memberId: r.memberId, title: r.title, remindOn: r.remindOn, recurring: r.recurring };
}

/** Delete a reminder. Admins can delete any; a coach may only delete their own. */
export async function deleteReminder(id: string, opts: { coachEmail: string; isAdmin: boolean }): Promise<boolean> {
  const { getDb } = await import("@/db");
  const { reminders } = await import("@/db/schema");
  const { eq, and } = await import("drizzle-orm");
  const where = opts.isAdmin ? eq(reminders.id, id) : and(eq(reminders.id, id), eq(reminders.coachEmail, opts.coachEmail));
  const res = await getDb().delete(reminders).where(where).returning({ id: reminders.id });
  return res.length > 0;
}

export interface DueReminder {
  id: string;
  coachEmail: string;
  title: string;
  memberName: string;
  team: string;
}

/** Reminders due today (NZ). Recurring ones match on month+day; one-offs match the
 *  full date. Skips inactive volunteers and anything already fired today. Joined
 *  with the member name + team for the email/notification content. */
export async function getDueReminders(): Promise<DueReminder[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { getDb } = await import("@/db");
    const { reminders, teamMembers, teams } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const today = nzToday(); // YYYY-MM-DD
    const mmdd = today.slice(5); // MM-DD

    const rows = await getDb()
      .select({
        id: reminders.id,
        coachEmail: reminders.coachEmail,
        title: reminders.title,
        remindOn: reminders.remindOn,
        recurring: reminders.recurring,
        lastFiredOn: reminders.lastFiredOn,
        memberName: teamMembers.name,
        teamName: teams.name,
        active: teamMembers.active,
      })
      .from(reminders)
      .innerJoin(teamMembers, eq(reminders.memberId, teamMembers.id))
      .leftJoin(teams, eq(teamMembers.teamId, teams.id));

    const due: DueReminder[] = [];
    for (const r of rows) {
      if (r.active === false) continue;
      if (r.lastFiredOn === today) continue; // already fired today
      const matches = r.recurring ? r.remindOn.slice(5) === mmdd : r.remindOn === today;
      if (!matches) continue;
      due.push({ id: r.id, coachEmail: r.coachEmail, title: r.title, memberName: r.memberName, team: r.teamName ?? "" });
    }
    return due;
  } catch {
    return [];
  }
}

/** Stamp a reminder as fired today so it won't re-send if the cron runs again. */
export async function markReminderFired(id: string): Promise<void> {
  const { getDb } = await import("@/db");
  const { reminders } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  await getDb().update(reminders).set({ lastFiredOn: nzToday() }).where(eq(reminders.id, id));
}

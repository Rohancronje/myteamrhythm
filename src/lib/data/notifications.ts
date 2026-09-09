// In-app notifications, one row per recipient. Currently produced by the reminder
// cron. Reads are defensive (→ [] / 0) so a missing table pre-migration never
// breaks the header bell or the notifications page.

export interface NotificationRow {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string; // ISO timestamp
}

export async function createNotification(input: {
  userEmail: string;
  kind?: string;
  title: string;
  body?: string | null;
  href?: string | null;
}): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const { getDb } = await import("@/db");
  const { notifications } = await import("@/db/schema");
  await getDb().insert(notifications).values({
    userEmail: input.userEmail,
    kind: input.kind ?? "reminder",
    title: input.title,
    body: input.body ?? null,
    href: input.href ?? null,
  });
}

/** Most recent notifications for a user (newest first). */
export async function listNotifications(userEmail: string, limit = 50): Promise<NotificationRow[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { getDb } = await import("@/db");
    const { notifications } = await import("@/db/schema");
    const { eq, desc } = await import("drizzle-orm");
    const rows = await getDb().select().from(notifications).where(eq(notifications.userEmail, userEmail)).orderBy(desc(notifications.createdAt)).limit(limit);
    return rows.map((r) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, href: r.href, read: r.readAt !== null, createdAt: r.createdAt.toISOString() }));
  } catch {
    return [];
  }
}

/** Unread count for the header badge. Cheap — one COUNT, defensive → 0. */
export async function unreadCount(userEmail: string): Promise<number> {
  if (!process.env.DATABASE_URL) return 0;
  try {
    const { getDb } = await import("@/db");
    const { notifications } = await import("@/db/schema");
    const { eq, and, isNull, count } = await import("drizzle-orm");
    const [row] = await getDb().select({ n: count() }).from(notifications).where(and(eq(notifications.userEmail, userEmail), isNull(notifications.readAt)));
    return Number(row?.n ?? 0);
  } catch {
    return 0;
  }
}

/** Mark one notification (by id) or all of a user's unread ones as read. Scoped to
 *  the user either way, so a coach can't touch another's notifications. */
export async function markRead(userEmail: string, opts: { id?: string; all?: boolean }): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const { getDb } = await import("@/db");
  const { notifications } = await import("@/db/schema");
  const { eq, and, isNull } = await import("drizzle-orm");
  const now = new Date();
  if (opts.all) {
    await getDb().update(notifications).set({ readAt: now }).where(and(eq(notifications.userEmail, userEmail), isNull(notifications.readAt)));
  } else if (opts.id) {
    await getDb().update(notifications).set({ readAt: now }).where(and(eq(notifications.id, opts.id), eq(notifications.userEmail, userEmail)));
  }
}

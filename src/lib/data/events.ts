// Upcoming events for the Home dashboard. Dates are stored as YYYY-MM-DD (NZ) so
// they're timezone-safe (like birthdays); time is free text.

import { nzToday } from "@/lib/time";

export interface EventItem {
  id: string;
  title: string;
  detail: string | null;
  location: string | null;
  eventDate: string; // YYYY-MM-DD
  eventTime: string | null;
  dateLabel: string; // e.g. "Sun 20 Sep"
  createdByName: string | null;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-NZ", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Future (today onward, NZ) events, soonest first. */
export async function getUpcomingEvents(limit = 20): Promise<EventItem[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { getDb } = await import("@/db");
    const { events } = await import("@/db/schema");
    const { gte, asc } = await import("drizzle-orm");
    const rows = await getDb().select().from(events).where(gte(events.eventDate, nzToday())).orderBy(asc(events.eventDate)).limit(limit);
    return rows.map((r) => ({ id: r.id, title: r.title, detail: r.detail, location: r.location, eventDate: r.eventDate, eventTime: r.eventTime, dateLabel: fmtDate(r.eventDate), createdByName: r.createdByName }));
  } catch {
    return [];
  }
}

export async function createEvent(input: { title: string; detail?: string | null; location?: string | null; eventDate: string; eventTime?: string | null; createdBy?: string; createdByName?: string }): Promise<void> {
  const { getDb } = await import("@/db");
  const { events } = await import("@/db/schema");
  await getDb().insert(events).values({
    title: input.title.trim(),
    detail: input.detail?.trim() || null,
    location: input.location?.trim() || null,
    eventDate: input.eventDate,
    eventTime: input.eventTime?.trim() || null,
    createdBy: input.createdBy ?? null,
    createdByName: input.createdByName ?? null,
  });
}

export async function deleteEvent(id: string): Promise<void> {
  const { getDb } = await import("@/db");
  const { events } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  await getDb().delete(events).where(eq(events.id, id));
}

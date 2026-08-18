// Bible reading plan + daily devotional data. Passages come from the DB plan;
// text comes live from bible-api.com (WEB, public-domain — safe to display in
// full). The personal reading streak is the ENCOURAGED kind (grace days), the
// opposite of the serving streak — never share their UI/copy.

import { nzToday } from "@/lib/time";

export interface ReadingDay {
  day: string;
  reference: string;
  seriesTitle: string | null;
}

async function db() {
  const { getDb } = await import("@/db");
  return getDb();
}

export async function getReadingToday(): Promise<ReadingDay | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { readingPlan } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await (await db()).select().from(readingPlan).where(eq(readingPlan.day, nzToday()));
    const r = rows[0];
    return r ? { day: r.day, reference: r.reference, seriesTitle: r.seriesTitle } : null;
  } catch {
    return null;
  }
}

export async function getReadingUpcoming(days = 6): Promise<ReadingDay[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { readingPlan } = await import("@/db/schema");
    const { gte, asc } = await import("drizzle-orm");
    const rows = await (await db()).select().from(readingPlan).where(gte(readingPlan.day, nzToday())).orderBy(asc(readingPlan.day)).limit(days);
    return rows.map((r) => ({ day: r.day, reference: r.reference, seriesTitle: r.seriesTitle }));
  } catch {
    return [];
  }
}

/** Live passage text from bible-api.com (WEB). Cached a day. */
export async function fetchPassage(reference: string): Promise<{ reference: string; text: string } | null> {
  try {
    const res = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}?translation=web`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { reference?: string; text?: string };
    if (!data.text) return null;
    return { reference: data.reference ?? reference, text: data.text.trim() };
  } catch {
    return null;
  }
}

export interface StreakInfo {
  streak: number;
  graceUsed: number;
  readToday: boolean;
}

/** Reading streak with up to 2 grace days (Duolingo-style freeze). */
export async function getReadingStreak(pcoId: string | undefined): Promise<StreakInfo> {
  if (!pcoId || !process.env.DATABASE_URL) return { streak: 0, graceUsed: 0, readToday: false };
  try {
    const { readingMarks } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await (await db()).select().from(readingMarks).where(eq(readingMarks.pcoId, pcoId));
    const read = new Set(rows.map((r) => r.day));
    const today = nzToday();
    if (read.size === 0) return { streak: 0, graceUsed: 0, readToday: false };

    // Grace is only spent on gaps BETWEEN reads — never on the empty days before
    // someone ever started (which would wrongly inflate "grace used").
    const minRead = [...read].sort()[0];
    let streak = 0;
    let freezesLeft = 2;
    let graceUsed = 0;
    const cursor = new Date(today + "T00:00:00Z");
    for (let i = 0; i < 400; i++) {
      const key = cursor.toISOString().slice(0, 10);
      if (key < minRead) break; // past all reads
      if (read.has(key)) {
        streak++;
      } else if (freezesLeft > 0) {
        freezesLeft--;
        graceUsed++;
      } else {
        break;
      }
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return { streak, graceUsed, readToday: read.has(today) };
  } catch {
    return { streak: 0, graceUsed: 0, readToday: false };
  }
}

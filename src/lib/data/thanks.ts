// Reads the thank-yous a person has received (reciprocity — surfaced back to them).
import { nzToday } from "@/lib/time";

export interface ThankItem {
  senderName: string | null;
  service: string | null;
  date: string | null;
}
export interface ThanksSummary {
  count: number;
  named: ThankItem[]; // ones where we know who thanked them
  anonymous: number;
}

export async function getThanksFor(pcoId: string | undefined, sinceDays = 21): Promise<ThanksSummary> {
  if (!pcoId || !process.env.DATABASE_URL) return { count: 0, named: [], anonymous: 0 };
  try {
    const { getDb } = await import("@/db");
    const { thankYous } = await import("@/db/schema");
    const { and, eq, gte, desc } = await import("drizzle-orm");
    const since = new Date(nzToday() + "T00:00:00Z");
    since.setUTCDate(since.getUTCDate() - sinceDays);
    const sinceISO = since.toISOString().slice(0, 10);

    const rows = await getDb()
      .select()
      .from(thankYous)
      .where(and(eq(thankYous.recipientPcoId, pcoId), gte(thankYous.serviceDate, sinceISO)))
      .orderBy(desc(thankYous.createdAt));

    const named = rows.filter((r) => r.senderName).map((r) => ({ senderName: r.senderName, service: r.service, date: r.serviceDate }));
    return { count: rows.length, named, anonymous: rows.length - named.length };
  } catch {
    return { count: 0, named: [], anonymous: 0 };
  }
}

// "Year in Rhythm" — a personal Wrapped-style recap from data we already hold.
// No new collection: distinct services, favourite service, most-frequent serving
// partners, teams, and thank-yous received.

import { serviceLabel } from "@/lib/data/upcoming";

export interface Recap {
  name: string;
  totalServices: number;
  favouriteService: string | null;
  teams: string[];
  partners: { name: string; together: number }[];
  thanksReceived: number;
  weeksServed: number;
}

function mode<T>(xs: T[]): T | undefined {
  const c = new Map<T, number>();
  let best: T | undefined;
  let n = 0;
  for (const x of xs) {
    const k = (c.get(x) ?? 0) + 1;
    c.set(x, k);
    if (k > n) { n = k; best = x; }
  }
  return best;
}

export async function getRecapFor(pcoId: string | undefined, name: string): Promise<Recap | null> {
  if (!pcoId || !process.env.DATABASE_URL) return null;
  try {
    const { getDb } = await import("@/db");
    const { servingEvents, people, thankYous } = await import("@/db/schema");
    const { eq, ne, and, inArray } = await import("drizzle-orm");
    const db = getDb();

    const mine = await db.select().from(servingEvents).where(eq(servingEvents.pcoId, pcoId));
    if (mine.length === 0) return null;

    const planIds = [...new Set(mine.map((e) => e.planId))];
    const weeks = new Set(mine.map((e) => e.serviceDate.slice(0, 7) + weekOf(e.serviceDate)));
    const favourite = mode(mine.map((e) => e.serviceType));
    const teams = [...new Set(mine.map((e) => e.position || "Team"))].slice(0, 6);

    // Serving partners — who else was on my plans.
    const co = planIds.length
      ? await db.select().from(servingEvents).where(and(inArray(servingEvents.planId, planIds), ne(servingEvents.pcoId, pcoId)))
      : [];
    const seen = new Set<string>();
    const together = new Map<string, number>();
    for (const e of co) {
      const k = `${e.pcoId}|${e.planId}`;
      if (seen.has(k)) continue; // count each person once per plan
      seen.add(k);
      together.set(e.pcoId, (together.get(e.pcoId) ?? 0) + 1);
    }
    const topIds = [...together.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);
    const nameRows = topIds.length ? await db.select().from(people).where(inArray(people.pcoId, topIds)) : [];
    const nameById = new Map(nameRows.map((p) => [p.pcoId, p.name]));
    const partners = topIds.map((id) => ({ name: nameById.get(id) ?? "A teammate", together: together.get(id) ?? 0 }));

    const thanks = await db.select().from(thankYous).where(eq(thankYous.recipientPcoId, pcoId));

    return {
      name,
      totalServices: planIds.length,
      favouriteService: favourite ? serviceLabel(favourite) : null,
      teams,
      partners,
      thanksReceived: thanks.length,
      weeksServed: weeks.size,
    };
  } catch {
    return null;
  }
}

function weekOf(dateISO: string): string {
  const d = new Date(dateISO + "T00:00:00Z");
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

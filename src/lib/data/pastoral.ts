// Pastoral follow-up state for one person. Structured tick-box state only — there
// are deliberately no free-text notes. Read fresh (not cached) so a just-saved
// tick shows immediately on refresh.

export interface PastoralCheck {
  reachedOut: boolean;
  checkedIn: boolean;
  outcome: "all_well" | "needs_support" | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

const EMPTY: PastoralCheck = { reachedOut: false, checkedIn: false, outcome: null, updatedBy: null, updatedAt: null };

/** True if a check records real follow-up action that's still current (within the
 *  staleness window) — so a person flagged again weeks later resurfaces. */
export function isFollowedUp(c: PastoralCheck | undefined, stalenessDays = 21): boolean {
  if (!c) return false;
  const acted = c.reachedOut || c.checkedIn || c.outcome !== null;
  if (!acted || !c.updatedAt) return false;
  const ageMs = Date.now() - new Date(c.updatedAt).getTime();
  return ageMs <= stalenessDays * 24 * 60 * 60 * 1000;
}

/** All pastoral checks, keyed by pcoId (small table — one query). */
export async function getAllPastoralChecks(): Promise<Map<string, PastoralCheck>> {
  const out = new Map<string, PastoralCheck>();
  if (!process.env.DATABASE_URL) return out;
  try {
    const { getDb } = await import("@/db");
    const { pastoralChecks } = await import("@/db/schema");
    const rows = await getDb().select().from(pastoralChecks);
    for (const r of rows) {
      out.set(r.pcoId, {
        reachedOut: r.reachedOut,
        checkedIn: r.checkedIn,
        outcome: (r.outcome as PastoralCheck["outcome"]) ?? null,
        updatedBy: r.updatedBy ?? null,
        updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
      });
    }
    return out;
  } catch {
    return out;
  }
}

export async function getPastoralCheck(pcoId: string): Promise<PastoralCheck> {
  if (!process.env.DATABASE_URL) return EMPTY;
  try {
    const { getDb } = await import("@/db");
    const { pastoralChecks } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [row] = await getDb().select().from(pastoralChecks).where(eq(pastoralChecks.pcoId, pcoId)).limit(1);
    if (!row) return EMPTY;
    return {
      reachedOut: row.reachedOut,
      checkedIn: row.checkedIn,
      outcome: (row.outcome as PastoralCheck["outcome"]) ?? null,
      updatedBy: row.updatedBy ?? null,
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
    };
  } catch {
    return EMPTY;
  }
}

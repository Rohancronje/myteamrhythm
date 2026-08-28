import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";

// Save a person's pastoral follow-up state. Structured tick boxes only — we accept
// booleans + an enum outcome, never free text. Admin (pastoral) only.
const Input = z.object({
  pcoId: z.string().min(1).max(64),
  reachedOut: z.boolean(),
  checkedIn: z.boolean(),
  outcome: z.enum(["all_well", "needs_support"]).nullable(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const p = parsed.data;

  if (process.env.DATABASE_URL) {
    try {
      const { getDb } = await import("@/db");
      const { pastoralChecks } = await import("@/db/schema");
      const row = {
        pcoId: p.pcoId,
        reachedOut: p.reachedOut,
        checkedIn: p.checkedIn,
        outcome: p.outcome,
        updatedBy: session.name,
        updatedAt: new Date(),
      };
      await getDb()
        .insert(pastoralChecks)
        .values(row)
        .onConflictDoUpdate({
          target: pastoralChecks.pcoId,
          set: { reachedOut: row.reachedOut, checkedIn: row.checkedIn, outcome: row.outcome, updatedBy: row.updatedBy, updatedAt: row.updatedAt },
        });
    } catch (e) {
      return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, updatedBy: session.name });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";

// Remove a coach: deletes the account and any team assignments. Admin only.
const Input = z.object({ email: z.string().email().max(200) });

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  if (email === session.email.toLowerCase()) return NextResponse.json({ ok: false, error: "You can't remove your own account." }, { status: 400 });

  try {
    const { getDb } = await import("@/db");
    const { users, teamCoaches } = await import("@/db/schema");
    const { eq, and } = await import("drizzle-orm");
    const db = getDb();
    await db.delete(teamCoaches).where(eq(teamCoaches.coachEmail, email));
    await db.delete(users).where(and(eq(users.email, email), eq(users.role, "coach")));
    const { logAudit } = await import("@/lib/data/audit");
    await logAudit("coach.remove", { actor: { email: session.email, name: session.name }, target: email, detail: "Coach account removed" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

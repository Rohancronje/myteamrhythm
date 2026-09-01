import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";

// Admin removes a person. Deletes the account and any coach team assignments.
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
    const { eq } = await import("drizzle-orm");
    const db = getDb();

    // Never remove the last admin — that would lock everyone out of admin.
    const [target] = await db.select({ role: users.role }).from(users).where(eq(users.email, email));
    if (target?.role === "admin") {
      const admins = await db.select({ email: users.email }).from(users).where(eq(users.role, "admin"));
      if (admins.length <= 1) return NextResponse.json({ ok: false, error: "Can't remove the last admin. Make someone else an admin first." }, { status: 400 });
    }

    await db.delete(teamCoaches).where(eq(teamCoaches.coachEmail, email));
    await db.delete(users).where(eq(users.email, email));
    const { logAudit } = await import("@/lib/data/audit");
    await logAudit("account.remove", { actor: { email: session.email, name: session.name }, target: email, detail: `Removed account (${target?.role ?? "unknown role"})` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";

// Admin changes an account's role (e.g. promote a coach to admin, or an admin to
// coach). Guarded so the last admin can't be demoted into a lockout.
const Input = z.object({
  email: z.string().email().max(200),
  role: z.enum(["admin", "coach", "leader", "pastor", "member"]),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const { role } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  try {
    const { getDb } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const d = getDb();

    // Never leave the org with no admin.
    if (role !== "admin") {
      const admins = await d.select({ email: users.email }).from(users).where(eq(users.role, "admin"));
      if (admins.length <= 1 && admins.some((a) => a.email === email)) {
        return NextResponse.json({ ok: false, error: "This is the only admin — promote someone else first." }, { status: 409 });
      }
    }

    const rows = await d.update(users).set({ role }).where(eq(users.email, email)).returning({ email: users.email, name: users.name });
    if (!rows.length) return NextResponse.json({ ok: false, error: "no such user" }, { status: 404 });
    const { logAudit } = await import("@/lib/data/audit");
    await logAudit("role.change", { actor: { email: session.email, name: session.name }, target: email, detail: `${rows[0].name} → ${role}` });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

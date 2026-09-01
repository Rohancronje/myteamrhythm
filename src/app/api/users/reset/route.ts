import { NextResponse } from "next/server";
import { randomBytes, scryptSync } from "node:crypto";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";

// Admin resets any user's password (invite-only "forgot password" flow). The admin
// can share the password by hand, or set notify:true to email it to the person.
const Input = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  notify: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const { email, password, notify } = parsed.data;

  const salt = randomBytes(16).toString("hex");
  const hash = "scrypt:" + salt + ":" + scryptSync(password, salt, 64).toString("hex");

  let name = email;
  try {
    const { getDb } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await getDb().update(users).set({ passwordHash: hash }).where(eq(users.email, email.toLowerCase())).returning({ name: users.name });
    if (!rows.length) return NextResponse.json({ ok: false, error: "no such user" }, { status: 404 });
    name = rows[0].name;
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }

  const { logAudit } = await import("@/lib/data/audit");
  await logAudit("account.reset", { actor: { email: session.email, name: session.name }, target: email, detail: `Password reset for ${name}` });

  if (notify) {
    // The password is already reset; never let an email hiccup turn this into a 500
    // (which Vercel renders as HTML — the source of the "not valid JSON" error).
    try {
      const { sendEmail, passwordResetEmail } = await import("@/lib/email");
      const { subject, html } = passwordResetEmail({ name, inviterName: session.name, email, password });
      const mail = await sendEmail({ to: email, toName: name, subject, html });
      return NextResponse.json({ ok: true, emailed: mail.ok, emailError: mail.ok ? undefined : mail.error });
    } catch (e) {
      return NextResponse.json({ ok: true, emailed: false, emailError: (e as Error).message });
    }
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { randomBytes, scryptSync } from "node:crypto";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";

// Admin invites/updates a coach: email + name + the teams they own + a password.
// (No email delivery yet — the admin shares the password with the coach.)
// Coaches are assigned to teams on the team page (team_coaches), so `teams` here is
// optional and legacy — kept only for the invite-email copy. Name is supplied as
// first + last (falls back to a single `name`).
const Input = z.object({
  email: z.string().email().max(200),
  firstName: z.string().max(80).optional(),
  lastName: z.string().max(80).optional(),
  name: z.string().max(160).optional(),
  phone: z.string().max(60).optional().nullable(),
  teams: z.array(z.string().max(120)).max(20).optional(),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const p = parsed.data;

  const name = (p.name?.trim() || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim());
  if (!name) return NextResponse.json({ ok: false, error: "Name is required." }, { status: 400 });
  const phone = p.phone?.trim() || null;

  const salt = randomBytes(16).toString("hex");
  const hash = "scrypt:" + salt + ":" + scryptSync(p.password, salt, 64).toString("hex");

  try {
    const { getDb } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const target = p.email.toLowerCase();
    const existing = await getDb().select({ email: users.email }).from(users).where(eq(users.email, target));

    if (existing.length) {
      // Already an account — don't duplicate or change their role. Just set the given
      // password so "add coach & email" reliably sends them a working login instead of
      // erroring out.
      await getDb().update(users).set({ passwordHash: hash }).where(eq(users.email, target));
    } else {
      const { writeUsers } = await import("@/db/writers");
      await writeUsers([{ email: target, name, phone, role: "coach", personId: null, teams: p.teams ?? [], passwordHash: hash }]);
    }
    const { logAudit } = await import("@/lib/data/audit");
    await logAudit(existing.length ? "coach.reset" : "coach.add", { actor: { email: session.email, name: session.name }, target: p.email, detail: existing.length ? `Password reset for ${name}` : `Coach invited: ${name}` });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }

  // Email the coach their invite (fails soft — the account is created either way,
  // so the admin can still share the password by hand if email bounces). Wrapped so an
  // email error returns JSON, not a 500 HTML page the client can't parse.
  try {
    const { sendEmail, coachInviteEmail } = await import("@/lib/email");
    const { subject, html } = coachInviteEmail({ coachName: name, inviterName: session.name, teams: p.teams ?? [], email: p.email, password: p.password });
    const mail = await sendEmail({ to: p.email, toName: name, subject, html });
    return NextResponse.json({ ok: true, emailed: mail.ok, emailError: mail.ok ? undefined : mail.error });
  } catch (e) {
    return NextResponse.json({ ok: true, emailed: false, emailError: (e as Error).message });
  }
}

import { NextResponse } from "next/server";
import { randomBytes, scryptSync } from "node:crypto";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";

// Admin adds a person and assigns their role. Coaches are then assigned to teams
// on the Teams page. Upserts by email.
const Input = z.object({
  firstName: z.string().max(80).optional(),
  lastName: z.string().max(80).optional(),
  name: z.string().max(160).optional(),
  email: z.string().email().max(200),
  phone: z.string().max(60).optional().nullable(),
  role: z.enum(["admin", "coach", "leader", "member"]),
  password: z.string().min(8).max(200),
  notify: z.boolean().optional(),
});

const ROLE_LABEL: Record<string, string> = { admin: "Admin", coach: "Coach", leader: "Leader", member: "Member" };

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const p = parsed.data;

  const name = p.name?.trim() || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
  if (!name) return NextResponse.json({ ok: false, error: "Name is required." }, { status: 400 });

  const salt = randomBytes(16).toString("hex");
  const hash = "scrypt:" + salt + ":" + scryptSync(p.password, salt, 64).toString("hex");

  const target = p.email.toLowerCase();
  try {
    const { getDb } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const existing = await getDb().select({ email: users.email, name: users.name, role: users.role }).from(users).where(eq(users.email, target));

    let finalName = name;
    let roleLabel = ROLE_LABEL[p.role] ?? p.role;
    const existed = existing.length > 0;

    if (existed) {
      // Already an account — DON'T duplicate or change their role (no accidental
      // demote). Just set the password to the one given, so "add & email" reliably
      // hands them a working login instead of erroring out.
      await getDb().update(users).set({ passwordHash: hash }).where(eq(users.email, target));
      finalName = existing[0].name || name;
      roleLabel = ROLE_LABEL[existing[0].role] ?? existing[0].role;
    } else {
      const { writeUsers } = await import("@/db/writers");
      await writeUsers([{ email: target, name, phone: p.phone?.trim() || null, role: p.role, personId: null, teams: [], passwordHash: hash }]);
    }

    const { logAudit } = await import("@/lib/data/audit");
    await logAudit(existed ? "account.reset" : "account.create", {
      actor: { email: session.email, name: session.name },
      target: p.email,
      detail: existed ? `Password reset (${roleLabel})` : `Created as ${roleLabel}`,
    });

    if (p.notify) {
      // The account is set up either way — never let an email hiccup become a 500
      // (which Vercel renders as HTML the client can't parse).
      try {
        const { sendEmail, accountInviteEmail } = await import("@/lib/email");
        const { subject, html } = accountInviteEmail({ name: finalName, inviterName: session.name, roleLabel, email: p.email, password: p.password });
        const mail = await sendEmail({ to: p.email, toName: finalName, subject, html });
        return NextResponse.json({ ok: true, existed, emailed: mail.ok, emailError: mail.ok ? undefined : mail.error });
      } catch (e) {
        return NextResponse.json({ ok: true, existed, emailed: false, emailError: (e as Error).message });
      }
    }
    return NextResponse.json({ ok: true, existed });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

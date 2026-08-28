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

  try {
    // Never silently overwrite (and possibly demote) an existing account.
    const { getDb } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const existing = await getDb().select({ email: users.email }).from(users).where(eq(users.email, p.email.toLowerCase()));
    if (existing.length) return NextResponse.json({ ok: false, error: "An account with that email already exists. Use Reset to change their password." }, { status: 409 });

    const { writeUsers } = await import("@/db/writers");
    await writeUsers([{ email: p.email.toLowerCase(), name, phone: p.phone?.trim() || null, role: p.role, personId: null, teams: [], passwordHash: hash }]);

    if (p.notify) {
      const { sendEmail, accountInviteEmail } = await import("@/lib/email");
      const { subject, html } = accountInviteEmail({ name, inviterName: session.name, roleLabel: ROLE_LABEL[p.role] ?? p.role, email: p.email, password: p.password });
      const mail = await sendEmail({ to: p.email, toName: name, subject, html });
      return NextResponse.json({ ok: true, emailed: mail.ok, emailError: mail.ok ? undefined : mail.error });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

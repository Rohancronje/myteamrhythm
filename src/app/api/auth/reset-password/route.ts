import { NextResponse } from "next/server";
import { randomBytes, scryptSync } from "node:crypto";
import { z } from "zod";
import { verifyResetToken } from "@/lib/auth/reset-token";

// Completes a self-service reset: a valid, unexpired token authorises setting a new
// password for the email it was issued to.
const Input = z.object({ token: z.string().min(10).max(600), password: z.string().min(8).max(200) });

export async function POST(req: Request) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Please choose a password of at least 8 characters." }, { status: 400 });

  const email = verifyResetToken(parsed.data.token);
  if (!email) return NextResponse.json({ ok: false, error: "This reset link is invalid or has expired. Request a new one." }, { status: 400 });

  try {
    const salt = randomBytes(16).toString("hex");
    const hash = "scrypt:" + salt + ":" + scryptSync(parsed.data.password, salt, 64).toString("hex");
    const { getDb } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await getDb().update(users).set({ passwordHash: hash }).where(eq(users.email, email)).returning({ name: users.name });
    if (!rows.length) return NextResponse.json({ ok: false, error: "Account not found." }, { status: 404 });
    const { logAudit } = await import("@/lib/data/audit");
    await logAudit("auth.reset_completed", { actor: { email, name: rows[0].name }, target: email, detail: "Set a new password via reset link" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

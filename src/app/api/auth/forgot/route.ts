import { NextResponse } from "next/server";
import { z } from "zod";

// Self-service "forgot password": emails a one-time reset link if the account exists.
// Always returns a generic success so it never reveals whether an email is registered.
const Input = z.object({ email: z.string().email().max(200) });

export async function POST(req: Request) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: true }); // generic — don't leak validity
  const email = parsed.data.email.toLowerCase();

  try {
    const { getDb } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [u] = await getDb().select({ email: users.email, name: users.name }).from(users).where(eq(users.email, email));
    if (u) {
      const { signResetToken } = await import("@/lib/auth/reset-token");
      const { sendEmail, passwordResetLinkEmail } = await import("@/lib/email");
      const { subject, html } = passwordResetLinkEmail({ name: u.name, token: signResetToken(email) });
      await sendEmail({ to: email, toName: u.name, subject, html });
      const { logAudit } = await import("@/lib/data/audit");
      await logAudit("auth.reset_requested", { actor: { email, name: u.name }, target: email, detail: "Requested a password-reset link" });
    }
  } catch {
    /* never surface anything — same generic response either way */
  }
  return NextResponse.json({ ok: true });
}

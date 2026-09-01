import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyCredentials } from "@/lib/auth/users";
import { SESSION_COOKIE, cookieOptions, signSession } from "@/lib/auth/session";

const Input = z.object({ email: z.string().email(), password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Input.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }

  const { logAudit } = await import("@/lib/data/audit");
  const user = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!user) {
    await logAudit("auth.login_failed", { target: parsed.data.email.toLowerCase(), detail: "Failed sign-in attempt" });
    // Deliberately vague — don't reveal whether the email exists.
    return NextResponse.json({ ok: false, error: "Wrong email or password" }, { status: 401 });
  }

  await logAudit("auth.login", { actor: { email: user.email, name: user.name }, detail: `Signed in (${user.role})` });
  const res = NextResponse.json({ ok: true, role: user.role, name: user.name });
  res.cookies.set(SESSION_COOKIE, signSession(user), cookieOptions);
  return res;
}

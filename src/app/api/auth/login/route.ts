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

  const user = verifyCredentials(parsed.data.email, parsed.data.password);
  if (!user) {
    // Deliberately vague — don't reveal whether the email exists.
    return NextResponse.json({ ok: false, error: "Wrong email or password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, role: user.role, name: user.name });
  res.cookies.set(SESSION_COOKIE, signSession(user), cookieOptions);
  return res;
}

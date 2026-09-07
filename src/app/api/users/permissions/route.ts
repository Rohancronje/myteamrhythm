import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";

// Admin grants/revokes an account's posting permissions.
const Input = z.object({
  email: z.string().email().max(200),
  canPostEvents: z.boolean().optional(),
  canPostResources: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const email = parsed.data.email.toLowerCase();

  const patch: Record<string, boolean> = {};
  if (parsed.data.canPostEvents !== undefined) patch.canPostEvents = parsed.data.canPostEvents;
  if (parsed.data.canPostResources !== undefined) patch.canPostResources = parsed.data.canPostResources;
  if (!Object.keys(patch).length) return NextResponse.json({ ok: true });

  try {
    const { getDb } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await getDb().update(users).set(patch).where(eq(users.email, email)).returning({ name: users.name });
    if (!rows.length) return NextResponse.json({ ok: false, error: "no such user" }, { status: 404 });
    const { logAudit } = await import("@/lib/data/audit");
    await logAudit("permissions.change", { actor: { email: session.email, name: session.name }, target: email, detail: Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(", ") });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

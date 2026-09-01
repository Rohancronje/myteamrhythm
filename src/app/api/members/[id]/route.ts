import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";
import { updateMember, removeMember } from "@/lib/data/teams-admin";

const Patch = z.object({
  name: z.string().min(1).max(160).optional(),
  email: z.string().max(200).nullable().optional(),
  phone: z.string().max(60).nullable().optional(),
  birthday: z.string().max(40).nullable().optional(),
  role: z.string().max(160).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  try {
    await updateMember(id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const { id } = await params;
  try {
    await removeMember(id);
    const { logAudit } = await import("@/lib/data/audit");
    await logAudit("member.remove", { actor: { email: session.email, name: session.name }, target: id, detail: "Volunteer removed from a team" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

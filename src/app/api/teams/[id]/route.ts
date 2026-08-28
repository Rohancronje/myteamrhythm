import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";
import { updateTeam, archiveTeam, setTeamCoaches } from "@/lib/data/teams-admin";

const Patch = z.object({
  name: z.string().min(1).max(120).optional(),
  campus: z.string().max(120).nullable().optional(),
  coachEmails: z.array(z.string().email()).max(50).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });

  try {
    const { name, campus, coachEmails } = parsed.data;
    if (name !== undefined || campus !== undefined) await updateTeam(id, { name, campus });
    if (coachEmails !== undefined) await setTeamCoaches(id, coachEmails);
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
    await archiveTeam(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

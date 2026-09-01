import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";
import { createTeam } from "@/lib/data/teams-admin";

const Input = z.object({
  name: z.string().min(1).max(120),
  campus: z.string().max(120).optional().nullable(),
  pcoTeams: z.array(z.string().max(160)).max(50).optional(),
  coachEmails: z.array(z.string().email()).max(50).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });

  try {
    const id = await createTeam({ ...parsed.data, createdBy: session.email });
    // If linked to Planning Center team(s), import their members straight away.
    const linked = parsed.data.pcoTeams ?? [];
    let synced: Awaited<ReturnType<typeof import("@/lib/data/teams-admin").syncTeamWithPco>> | undefined;
    if (linked.length) {
      const { syncTeamWithPco } = await import("@/lib/data/teams-admin");
      synced = await syncTeamWithPco(id);
    }
    const { logAudit } = await import("@/lib/data/audit");
    await logAudit("team.create", {
      actor: { email: session.email, name: session.name },
      target: parsed.data.name,
      detail: `Team created${linked.length ? ` · linked to ${linked.join(", ")}${synced?.ok ? ` (+${synced.added} imported)` : ""}` : parsed.data.campus ? ` · ${parsed.data.campus}` : ""}`,
    });
    return NextResponse.json({ ok: true, id, synced });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";
import { syncTeamWithPco } from "@/lib/data/teams-admin";

// Reconcile a team's volunteers with its linked Planning Center team. An optional
// pcoTeam (re)links the team first, so "link & sync" is one call.
const Input = z.object({ pcoTeams: z.array(z.string().max(160)).max(50).optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = Input.safeParse(await req.json().catch(() => ({})));
  const pcoTeams = parsed.success ? parsed.data.pcoTeams : undefined;

  try {
    const result = await syncTeamWithPco(id, pcoTeams);
    if (result.ok) {
      const { logAudit } = await import("@/lib/data/audit");
      await logAudit("team.sync", {
        actor: { email: session.email, name: session.name },
        target: (result.pcoTeams ?? []).join(", "),
        detail: `Synced with Planning Center — ${result.added} added, ${result.removed} removed, ${result.kept} kept`,
      });
    }
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

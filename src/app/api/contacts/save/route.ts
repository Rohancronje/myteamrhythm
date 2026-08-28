import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";

// Edit a volunteer's contact details + birthday inline from Connect. The values are
// written onto the team_members row. Coach (own team) or admin.
const Input = z.object({
  pcoId: z.string().min(1).max(64), // team member id
  email: z.string().email().max(200).nullish().or(z.literal("")),
  phone: z.string().max(40).nullish().or(z.literal("")),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish().or(z.literal("")),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "coach" && session.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const p = parsed.data;

  if (session.role === "coach") {
    const { teamIdOfMember } = await import("@/lib/data/teams-admin");
    const { getUserTeams } = await import("@/lib/auth/users");
    const [memberTeam, myTeams] = await Promise.all([teamIdOfMember(p.pcoId), getUserTeams(session.email)]);
    if (!memberTeam || !myTeams.includes(memberTeam)) return NextResponse.json({ ok: false, error: "not your team" }, { status: 403 });
  }

  try {
    const { updateMember } = await import("@/lib/data/teams-admin");
    await updateMember(p.pcoId, { email: p.email || null, phone: p.phone || null, birthday: p.birthday || null });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

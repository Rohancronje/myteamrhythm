import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";

// Log that a coach connected with a person. The note is FYI-for-next-time, not a
// confidential record (the UI says so). Coaches may only log within their teams.
const Input = z.object({
  pcoId: z.string().min(1).max(64),
  note: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "coach" && session.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const { pcoId, note } = parsed.data;

  // Coaches may only log for volunteers on their own teams.
  if (session.role === "coach") {
    const { teamIdOfMember } = await import("@/lib/data/teams-admin");
    const { getUserTeams } = await import("@/lib/auth/users");
    const [memberTeam, myTeams] = await Promise.all([teamIdOfMember(pcoId), getUserTeams(session.email)]);
    if (!memberTeam || !myTeams.includes(memberTeam)) return NextResponse.json({ ok: false, error: "not your team" }, { status: 403 });
  }

  // Rewrite the FYI note for NZ Privacy Act 2020 / confidentiality before storing.
  let cleanNote: string | null = note?.trim() || null;
  let noteChanged = false;
  if (cleanNote) {
    const { sanitizeNote } = await import("@/lib/ai");
    const r = await sanitizeNote(cleanNote);
    cleanNote = r.text.trim() || null;
    noteChanged = r.changed;
  }

  if (process.env.DATABASE_URL) {
    try {
      const { getDb } = await import("@/db");
      const { connections } = await import("@/db/schema");
      await getDb().insert(connections).values({ pcoId, coachEmail: session.email, note: cleanNote });
    } catch (e) {
      return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true, note: cleanNote, noteChanged });
}

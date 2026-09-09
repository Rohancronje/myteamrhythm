import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";

// Reminders for significant dates on a volunteer. Coaches may only touch reminders
// for volunteers on their own teams; admins may touch any.
//   GET    ?memberId=…        list a volunteer's reminders
//   POST   {memberId,title,remindOn,recurring}  create
//   DELETE {id}              delete (own reminder, or any if admin)

/** True if this coach has the member's team assigned to them. */
async function coachOwnsMember(email: string, memberId: string): Promise<boolean> {
  const { teamIdOfMember } = await import("@/lib/data/teams-admin");
  const { getUserTeams } = await import("@/lib/auth/users");
  const [memberTeam, myTeams] = await Promise.all([teamIdOfMember(memberId), getUserTeams(email)]);
  return !!memberTeam && myTeams.includes(memberTeam);
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "coach" && session.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const memberId = new URL(req.url).searchParams.get("memberId") ?? "";
  if (!memberId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  if (session.role === "coach" && !(await coachOwnsMember(session.email, memberId))) {
    return NextResponse.json({ ok: false, error: "not your team" }, { status: 403 });
  }
  const { listRemindersForMember } = await import("@/lib/data/reminders");
  const reminders = await listRemindersForMember(memberId);
  return NextResponse.json({ ok: true, reminders });
}

const CreateInput = z.object({
  memberId: z.string().min(1).max(64),
  title: z.string().trim().min(1).max(80),
  remindOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  recurring: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "coach" && session.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const parsed = CreateInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const p = parsed.data;

  if (session.role === "coach" && !(await coachOwnsMember(session.email, p.memberId))) {
    return NextResponse.json({ ok: false, error: "not your team" }, { status: 403 });
  }

  try {
    const { createReminder } = await import("@/lib/data/reminders");
    const reminder = await createReminder({
      memberId: p.memberId,
      coachEmail: session.email,
      title: p.title,
      remindOn: p.remindOn,
      recurring: p.recurring,
    });
    return NextResponse.json({ ok: true, reminder });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

const DeleteInput = z.object({ id: z.string().min(1).max(64) });

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "coach" && session.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const parsed = DeleteInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });

  try {
    const { deleteReminder } = await import("@/lib/data/reminders");
    const ok = await deleteReminder(parsed.data.id, { coachEmail: session.email, isAdmin: session.role === "admin" });
    if (!ok) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

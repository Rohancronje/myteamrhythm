import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";
import { getPerms } from "@/lib/auth/permissions";
import { createEvent } from "@/lib/data/events";

const Input = z.object({
  title: z.string().min(1).max(160),
  detail: z.string().max(2000).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  eventTime: z.string().max(60).optional().nullable(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const perms = await getPerms(session.email, session.role);
  if (!perms.canPostEvents) return NextResponse.json({ ok: false, error: "You don't have permission to post events." }, { status: 403 });

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Please give the event a title and a date." }, { status: 400 });

  try {
    await createEvent({ ...parsed.data, createdBy: session.email, createdByName: session.name });
    const { logAudit } = await import("@/lib/data/audit");
    await logAudit("event.create", { actor: { email: session.email, name: session.name }, target: parsed.data.title, detail: `Event on ${parsed.data.eventDate}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

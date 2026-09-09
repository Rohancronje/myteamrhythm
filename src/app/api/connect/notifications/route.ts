import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";

// The signed-in user's own notifications.
//   GET             list recent notifications + unread count
//   POST {id} | {all:true}   mark one / all as read

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "coach" && session.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const { listNotifications, unreadCount } = await import("@/lib/data/notifications");
  const [notifications, unread] = await Promise.all([listNotifications(session.email), unreadCount(session.email)]);
  return NextResponse.json({ ok: true, notifications, unread });
}

const Input = z.object({ id: z.string().min(1).max(64).optional(), all: z.boolean().optional() });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "coach" && session.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.id && !parsed.data.all)) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  try {
    const { markRead } = await import("@/lib/data/notifications");
    await markRead(session.email, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

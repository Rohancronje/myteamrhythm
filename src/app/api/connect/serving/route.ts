import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";
import { getServingIndex } from "@/lib/data/serving";
import { nzToday } from "@/lib/time";

// On-demand Planning Center serving info for one person (last serve / next serving /
// 6-week load), fetched when a Connect card is expanded — keeps the whole serving
// index off the Connect page's initial load.
const Input = z.object({ name: z.string().min(1).max(160) });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "coach" && session.role !== "admin")) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: true, serving: null });

  try {
    const idx = await getServingIndex();
    const pcoId = idx.pcoIdFor(parsed.data.name);
    if (!pcoId) return NextResponse.json({ ok: true, serving: null });
    const today = nzToday();
    return NextResponse.json({ ok: true, serving: { last: idx.lastServe(pcoId, today), next: idx.nextServe(pcoId), load: idx.load6w(pcoId, today) } });
  } catch {
    return NextResponse.json({ ok: true, serving: null });
  }
}

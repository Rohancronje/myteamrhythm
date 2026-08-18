import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";
import { nzToday } from "@/lib/time";

// Receives a pulse check-in. Stores the (pseudonymous) mood, and records any Q4
// peer thank-yous so they can be surfaced back to the person thanked. If the
// pulse was filled while signed in, we know the sender; otherwise it's anonymous.

const PulseInput = z.object({
  service: z.string().max(60).optional(),
  energy: z.string().max(40),
  worshipOrWork: z.string().max(40),
  word: z.string().max(40).optional(),
  thanks: z.string().max(400).optional(),
  thankedIds: z.array(z.string().max(40)).max(50).optional(),
  token: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = PulseInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const p = parsed.data;

  if (process.env.DATABASE_URL) {
    try {
      const { getDb } = await import("@/db");
      const { pulseResponses, thankYous } = await import("@/db/schema");
      const db = getDb();
      const today = nzToday();
      await db.insert(pulseResponses).values({
        service: p.service ?? null,
        serviceDate: today,
        energy: p.energy,
        worshipOrWork: p.worshipOrWork,
        word: p.word ?? null,
        thanks: p.thanks ?? null,
      });

      const ids = [...new Set(p.thankedIds ?? [])];
      if (ids.length) {
        const sender = await getSession().catch(() => null);
        await db.insert(thankYous).values(
          ids.map((recipientPcoId) => ({
            recipientPcoId,
            senderPcoId: sender?.personId ?? null,
            senderName: sender?.name ?? null,
            service: p.service ?? null,
            serviceDate: today,
          })),
        );
      }
    } catch {
      // Optimistic ack — a failed write must never make someone feel rejected.
    }
  }

  return NextResponse.json({ ok: true });
}

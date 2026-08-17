import { NextResponse } from "next/server";
import { z } from "zod";

// Receives a pulse check-in. In the pilot this validates and (in production)
// writes to pulse_responses keyed by the pseudonymous handle carried on the link
// token — never by name. Here we validate and acknowledge; the DB write is wired
// once DATABASE_URL is set.

const PulseInput = z.object({
  service: z.string().max(60).optional(),
  // Q1: More energy / About the same / Less energy
  energy: z.string().max(40),
  // Q2: More like worship / More like work
  worshipOrWork: z.string().max(40),
  // Q3: one word (word cloud) · Q4: teammate to thank (companionship)
  word: z.string().max(40).optional(),
  thanks: z.string().max(120).optional(),
  // In production the link carries a signed token → participant handle.
  token: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = PulseInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  if (process.env.DATABASE_URL) {
    try {
      const { getDb } = await import("@/db");
      const { pulseResponses } = await import("@/db/schema");
      const p = parsed.data;
      await getDb().insert(pulseResponses).values({
        service: p.service ?? null,
        serviceDate: new Date().toISOString().slice(0, 10),
        energy: p.energy,
        worshipOrWork: p.worshipOrWork,
        word: p.word ?? null,
        thanks: p.thanks ?? null,
      });
    } catch {
      // Optimistic ack: a failed write must never make someone feel their honesty
      // was rejected. Surface nothing identifying on error.
    }
  }

  return NextResponse.json({ ok: true });
}

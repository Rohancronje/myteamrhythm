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

  // TODO: resolve token → participantHandle, then insert into pulse_responses.
  // Deliberately NOT logging the note or any identifying detail here.
  return NextResponse.json({ ok: true });
}

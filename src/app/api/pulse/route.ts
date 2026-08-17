import { NextResponse } from "next/server";
import { z } from "zod";

// Receives a pulse check-in. In the pilot this validates and (in production)
// writes to pulse_responses keyed by the pseudonymous handle carried on the link
// token — never by name. Here we validate and acknowledge; the DB write is wired
// once DATABASE_URL is set.

const PulseInput = z.object({
  service: z.string().max(60).optional(),
  energy: z.number().int().min(1).max(5),
  meaning: z.number().int().min(1).max(5),
  connection: z.number().int().min(1).max(5),
  note: z.string().max(2000).optional(),
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

import { NextResponse } from "next/server";
import { fetchPassage } from "@/lib/data/reading";

export const dynamic = "force-dynamic";

// Returns readable passage text (WEB, public domain) for a reference, so the
// worship-set scriptures can be expanded and read inline.
export async function GET(req: Request) {
  const ref = new URL(req.url).searchParams.get("ref");
  if (!ref) return NextResponse.json({ ok: false, error: "no ref" }, { status: 400 });
  const p = await fetchPassage(ref);
  if (!p) return NextResponse.json({ ok: false, error: "not found" }, { status: 502 });
  return NextResponse.json({ ok: true, reference: p.reference, text: p.text });
}

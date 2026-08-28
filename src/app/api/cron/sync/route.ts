import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { syncUpcoming, syncRoster, syncSongs } from "@/lib/pco/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Nightly refresh (Vercel Cron). Keeps history current with a short recent window
// (past services don't change), and refreshes the full upcoming window. Instant
// changes are handled separately by the webhook. Secured by CRON_SECRET, which
// Vercel Cron sends automatically in the Authorization header.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const upcoming = await syncUpcoming(6);
    const roster = await syncRoster(3);
    const songs = await syncSongs(3);
    // New data landed — drop the cached loaders so pages show it immediately
    // instead of waiting out the revalidate window.
    revalidateTag("upcoming", "max");
    revalidateTag("team", "max");
    revalidateTag("songs", "max");
    return NextResponse.json({ ok: true, upcoming, roster, songs });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}

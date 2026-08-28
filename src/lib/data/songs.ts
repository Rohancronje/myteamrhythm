// Song Intelligence data source. Reads from Postgres when DATABASE_URL is set,
// otherwise the local snapshot; returns computed intel or null (honest empty).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { unstable_cache } from "next/cache";
import { buildSongIntel, type SongIntel, type SongsSnapshot } from "@/lib/songs/intel";

async function loadSnapshot(): Promise<SongsSnapshot | null> {
  if (process.env.DATABASE_URL) {
    const { readSongsSnapshot } = await import("@/db/read");
    const snap = (await readSongsSnapshot()) as SongsSnapshot;
    return snap.services.length ? snap : null;
  }
  try {
    return JSON.parse(readFileSync(join(process.cwd(), ".data", "pco-songs.json"), "utf8")) as SongsSnapshot;
  } catch {
    return null;
  }
}

// Setlists change only on sync, so cache the computed intel for a short window
// (refreshed on cron/webhook via revalidateTag("songs")).
const load = unstable_cache(
  async () => {
    const snap = await loadSnapshot();
    return snap ? buildSongIntel(snap) : null;
  },
  ["rhythm:songs"],
  { revalidate: 300, tags: ["songs"] },
);

export async function getSongIntel(): Promise<SongIntel | null> {
  return load();
}

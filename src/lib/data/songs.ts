// Song Intelligence data source. Reads from Postgres when DATABASE_URL is set,
// otherwise the local snapshot; returns computed intel or null (honest empty).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSongIntel, type SongIntel, type SongsSnapshot } from "@/lib/songs/intel";

let cache: Promise<SongIntel | null> | null = null;

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

export async function getSongIntel(): Promise<SongIntel | null> {
  if (!cache) {
    cache = loadSnapshot().then((snap) => (snap ? buildSongIntel(snap) : null));
  }
  return cache;
}

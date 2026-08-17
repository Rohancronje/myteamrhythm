// Song Intelligence data source. Reads the setlist snapshot; returns computed
// intel or null when nothing is synced (honest empty state).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSongIntel, type SongIntel, type SongsSnapshot } from "@/lib/songs/intel";

let cache: SongIntel | null | undefined;

export function getSongIntel(): SongIntel | null {
  if (cache !== undefined) return cache;
  try {
    const raw = readFileSync(join(process.cwd(), ".data", "pco-songs.json"), "utf8");
    cache = buildSongIntel(JSON.parse(raw) as SongsSnapshot);
  } catch {
    cache = null;
  }
  return cache;
}

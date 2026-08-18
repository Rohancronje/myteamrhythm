// Backoffice song-tagging data. Distinct songs (from the synced setlists) merged
// with their theme/scripture tags. Lyrics are NEVER stored — tagging captures only
// conclusions (themes + refs), per the handover.

import type { TagStatus, TaggableSong } from "@/lib/songs/tags-shared";
export type { TagStatus, TaggableSong } from "@/lib/songs/tags-shared";

export async function getSongsForTagging(): Promise<TaggableSong[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { getDb } = await import("@/db");
    const { songSlots, songTags } = await import("@/db/schema");
    const db = getDb();
    const [slots, tags] = await Promise.all([db.select().from(songSlots), db.select().from(songTags)]);

    const agg = new Map<string, { display: string; count: number; keys: string[] }>();
    for (const s of slots) {
      const key = s.title.trim().toLowerCase();
      const a = agg.get(key) ?? { display: s.title.trim(), count: 0, keys: [] };
      a.count++;
      if (s.keyName) a.keys.push(s.keyName);
      agg.set(key, a);
    }
    const tagByTitle = new Map(tags.map((t) => [t.title, t]));

    return [...agg.entries()]
      .map(([title, a]) => {
        const t = tagByTitle.get(title);
        return {
          title,
          displayTitle: a.display,
          timesUsed: a.count,
          key: mode(a.keys) ?? "",
          status: (t?.status as TagStatus) ?? "pending",
          themes: (t?.themes as string[]) ?? [],
          scriptureRefs: (t?.scriptureRefs as string[]) ?? [],
          notes: t?.notes ?? "",
        };
      })
      .sort((x, y) => y.timesUsed - x.timesUsed);
  } catch {
    return [];
  }
}

function mode<T>(xs: T[]): T | undefined {
  const c = new Map<T, number>();
  let best: T | undefined;
  let n = 0;
  for (const x of xs) {
    const k = (c.get(x) ?? 0) + 1;
    c.set(x, k);
    if (k > n) { n = k; best = x; }
  }
  return best;
}

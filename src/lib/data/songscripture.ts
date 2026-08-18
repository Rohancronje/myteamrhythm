// Maps a song title → its tagged themes + scripture references, for surfacing
// "scriptures behind the songs" on the setlist, in Song Intelligence, and for
// matching a reading to relevant songs. Only returns songs that have been tagged.

export interface SongScripture {
  themes: string[];
  refs: string[];
  status: "tagged" | "needs_review";
}

export async function getSongScriptureMap(): Promise<Map<string, SongScripture>> {
  const map = new Map<string, SongScripture>();
  if (!process.env.DATABASE_URL) return map;
  try {
    const { getDb } = await import("@/db");
    const { songTags } = await import("@/db/schema");
    const { ne } = await import("drizzle-orm");
    const rows = await getDb().select().from(songTags).where(ne(songTags.status, "pending"));
    for (const r of rows) {
      const refs = (r.scriptureRefs as string[]) ?? [];
      const themes = (r.themes as string[]) ?? [];
      if (refs.length === 0 && themes.length === 0) continue;
      map.set(r.title, { themes, refs, status: (r.status as "tagged" | "needs_review") });
    }
    return map;
  } catch {
    return map;
  }
}

/** The book (+chapter) of a reference, e.g. "Genesis 1:1-25" → "genesis 1". */
export function refRoot(ref: string): string {
  const m = ref.trim().match(/^([\d]?\s?[A-Za-z. ]+?)\s*(\d+)?/);
  if (!m) return ref.trim().toLowerCase();
  const book = m[1].trim().toLowerCase();
  return m[2] ? `${book} ${m[2]}` : book;
}

// Starter song→scripture tags for well-known songs in rotation. Marked
// "needs_review" — a first pass to demonstrate the feature; a human confirms
// before it's authoritative (handover section 6). Lyrics are never stored.
import { readFileSync } from "node:fs";
import { getDb } from "../src/db";
import { songTags } from "../src/db/schema";

function loadEnv(path: string) {
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) process.env[m[1]] ??= m[2];
  }
}
loadEnv(".env.local");

const SEED: { title: string; themes: string[]; refs: string[] }[] = [
  { title: "Goodness Of God", themes: ["Faithfulness", "Thanksgiving"], refs: ["Psalm 23", "Psalm 136:1"] },
  { title: "Way Maker", themes: ["God's presence", "God's provision"], refs: ["Isaiah 43:19", "John 5:1-9"] },
  { title: "Gratitude", themes: ["Thanksgiving", "Praise & adoration"], refs: ["Psalm 100", "Psalm 103:1-5"] },
  { title: "Everything With Breath", themes: ["Praise & adoration"], refs: ["Psalm 150"] },
  { title: "Praise", themes: ["Praise & adoration"], refs: ["Psalm 150", "Psalm 113"] },
  { title: "Jehovah", themes: ["God's presence", "Holiness"], refs: ["Exodus 3:14", "Psalm 46:1"] },
  { title: "You Are Holy", themes: ["Holiness", "Worship"], refs: ["Isaiah 6:1-3", "Revelation 4:8"] },
  { title: "Spirit Break Out", themes: ["Holy Spirit"], refs: ["Acts 2:1-4", "Ezekiel 37:1-14"] },
  { title: "It Really Is Amazing Grace", themes: ["Grace", "Salvation"], refs: ["Ephesians 2:8-9", "John 1:16"] },
  { title: "Jesus Be The Name", themes: ["Salvation", "Praise & adoration"], refs: ["Philippians 2:9-11", "Acts 4:12"] },
];

(async () => {
  const db = getDb();
  for (const s of SEED) {
    await db
      .insert(songTags)
      .values({ title: s.title.toLowerCase(), displayTitle: s.title, themes: s.themes, scriptureRefs: s.refs, status: "needs_review", taggedBy: "Starter pass (AI-drafted)" })
      .onConflictDoUpdate({ target: songTags.title, set: { themes: s.themes, scriptureRefs: s.refs } });
  }
  console.log(`✓ seeded ${SEED.length} starter song tags (needs_review)`);
  await db.$client.end?.();
  process.exit(0);
})();

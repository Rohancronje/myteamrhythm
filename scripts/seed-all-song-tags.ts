// Give EVERY song in rotation a matching scripture reference (first pass, marked
// needs_review — a human confirms before it's authoritative, per handover §6).
// Lyrics are never stored. Verses are chosen by the song's known scriptural basis;
// key/live variants share the base song's mapping.
import { readFileSync } from "node:fs";
import { getDb } from "../src/db";
import { songSlots, songTags } from "../src/db/schema";

function loadEnv(path: string) {
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) process.env[m[1]] ??= m[2];
  }
}
loadEnv(".env.local");

/** Normalise a title to its base song (strip key/live/feat/prefixes). */
function base(title: string): string {
  let t = title.toLowerCase().trim();
  t = t.replace(/^(kids item|ministry song)\s*-\s*/, "");
  t = t.replace(/\s*\[[^\]]*\]\s*$/, "");
  t = t.replace(/\s*\(feat[^)]*\)\s*/, " ");
  t = t.replace(/\s*\(live\)\s*$/, "");
  return t.replace(/\s+/g, " ").trim();
}

// base title → [refs, themes]
const MAP: Record<string, { refs: string[]; themes: string[] }> = {
  "joy of the lord": { refs: ["Nehemiah 8:10", "Psalm 16:11"], themes: ["Thanksgiving", "Hope"] },
  "praise": { refs: ["Psalm 150", "Psalm 113"], themes: ["Praise & adoration"] },
  "i know that i know": { refs: ["2 Timothy 1:12", "1 John 5:13"], themes: ["Trust", "Faithfulness"] },
  "jesus be the name": { refs: ["Philippians 2:9-11", "Acts 4:12"], themes: ["Salvation", "Praise & adoration"] },
  "who else": { refs: ["Isaiah 40:25-31", "Exodus 15:11"], themes: ["Worship", "Holiness"] },
  "i know a name": { refs: ["Proverbs 18:10", "Acts 4:12"], themes: ["Trust", "Salvation"] },
  "everything with breath": { refs: ["Psalm 150"], themes: ["Praise & adoration"] },
  "washed": { refs: ["1 Corinthians 6:11", "Isaiah 1:18"], themes: ["Grace", "Salvation"] },
  "it really is amazing grace": { refs: ["Ephesians 2:8-9", "John 1:16"], themes: ["Grace", "Salvation"] },
  "the joy": { refs: ["Nehemiah 8:10", "Psalm 30:11"], themes: ["Thanksgiving", "Hope"] },
  "reasons": { refs: ["Psalm 103:1-5", "Lamentations 3:22-23"], themes: ["Thanksgiving", "Faithfulness"] },
  "all hail king jesus": { refs: ["Revelation 19:16", "Philippians 2:9-11"], themes: ["Worship", "Praise & adoration"] },
  "christ and christ crucified": { refs: ["1 Corinthians 2:2", "Galatians 6:14"], themes: ["The cross", "Salvation"] },
  "i believe": { refs: ["Mark 9:24", "John 11:25-27"], themes: ["Trust", "Resurrection"] },
  "holy hands": { refs: ["1 Timothy 2:8", "Psalm 134:2"], themes: ["Worship", "Surrender"] },
  "the dove": { refs: ["Matthew 3:16", "Genesis 8:8-12"], themes: ["Holy Spirit", "God's presence"] },
  "holy forever": { refs: ["Revelation 4:8", "Isaiah 6:3"], themes: ["Holiness", "Worship"] },
  "gratitude": { refs: ["Psalm 100", "Psalm 103:1-5"], themes: ["Thanksgiving", "Praise & adoration"] },
  "center": { refs: ["Colossians 1:16-17"], themes: ["Surrender", "Worship"] },
  "nothing but the blood": { refs: ["Hebrews 9:22", "1 John 1:7"], themes: ["The cross", "Salvation"] },
  "goodbye yesterday": { refs: ["2 Corinthians 5:17", "Isaiah 43:18-19"], themes: ["Freedom", "Identity in Christ"] },
  "be enthroned": { refs: ["Psalm 22:3", "Revelation 4:11"], themes: ["Worship", "Holiness"] },
  "elohim": { refs: ["Genesis 1:1", "Deuteronomy 10:17"], themes: ["Creation", "Holiness"] },
  "worthy": { refs: ["Revelation 5:12", "Revelation 4:11"], themes: ["Worship", "Praise & adoration"] },
  "so be it": { refs: ["Revelation 22:20-21", "2 Corinthians 1:20"], themes: ["Surrender", "Faithfulness"] },
  "what a god": { refs: ["Psalm 77:13-14", "Deuteronomy 4:39"], themes: ["Praise & adoration", "God's presence"] },
  "anything is possible": { refs: ["Matthew 19:26", "Luke 1:37"], themes: ["Hope", "Trust"] },
  "how great thou art": { refs: ["Psalm 8", "Psalm 145:3"], themes: ["Creation", "Praise & adoration"] },
  "goodness of god": { refs: ["Psalm 23", "Psalm 136:1"], themes: ["Faithfulness", "Thanksgiving"] },
  "you are holy": { refs: ["Isaiah 6:1-3", "Revelation 4:8"], themes: ["Holiness", "Worship"] },
  "alleluia": { refs: ["Revelation 19:1-6", "Psalm 146:1"], themes: ["Praise & adoration"] },
  "no one like the lord": { refs: ["Exodus 15:11", "1 Samuel 2:2"], themes: ["Holiness", "Worship"] },
  "agnus dei": { refs: ["John 1:29", "Revelation 5:12"], themes: ["The cross", "Worship"] },
  "spirit break out": { refs: ["Acts 2:1-4", "Ezekiel 37:1-14"], themes: ["Holy Spirit"] },
  "i speak jesus": { refs: ["Philippians 2:10", "Acts 4:12"], themes: ["Salvation", "Mission"] },
  "awake my soul": { refs: ["Psalm 57:8", "Ephesians 5:14"], themes: ["Hope", "Praise & adoration"] },
  "rest on us": { refs: ["Acts 2:1-4", "Isaiah 11:2"], themes: ["Holy Spirit", "God's presence"] },
  "i exalt thee": { refs: ["Psalm 97:9", "Psalm 145:1"], themes: ["Worship", "Praise & adoration"] },
  "o praise the name (anástasis)": { refs: ["Romans 6:9", "1 Corinthians 15:20"], themes: ["Resurrection", "The cross"] },
  "when wind meets fire": { refs: ["Acts 2:1-4"], themes: ["Holy Spirit"] },
  "great is the name": { refs: ["Psalm 8:1", "Philippians 2:9"], themes: ["Praise & adoration"] },
  "forever yhwh": { refs: ["Exodus 3:14-15", "Psalm 102:12"], themes: ["Faithfulness", "God's presence"] },
  "bless god": { refs: ["Psalm 103:1-2", "Psalm 34:1"], themes: ["Praise & adoration", "Thanksgiving"] },
  "way maker": { refs: ["Isaiah 43:19", "John 5:1-9"], themes: ["God's presence", "God's provision"] },
  "jehovah": { refs: ["Exodus 3:14", "Psalm 46:1"], themes: ["God's presence", "Holiness"] },
  "blood of christ": { refs: ["Hebrews 9:14", "1 Peter 1:18-19"], themes: ["The cross", "Salvation"] },
  "give me jesus": { refs: ["Philippians 3:8", "John 6:68"], themes: ["Surrender", "Hope"] },
  "our god reigns (forever his truth shall reign)": { refs: ["Isaiah 52:7", "Revelation 19:6"], themes: ["Worship", "Hope"] },
  "house of miracles": { refs: ["Acts 3:6-8", "Psalm 77:14"], themes: ["God's provision", "Hope"] },
  "thank god i'm free": { refs: ["John 8:36", "Galatians 5:1"], themes: ["Freedom", "Salvation"] },
  "is he worthy": { refs: ["Revelation 5:1-10"], themes: ["Worship", "Hope"] },
  "because of christ": { refs: ["Ephesians 2:13", "Romans 5:8"], themes: ["Grace", "Identity in Christ"] },
  "king of kings": { refs: ["Revelation 19:16", "1 Timothy 6:15"], themes: ["The cross", "Resurrection"] },
  "great are you lord": { refs: ["Psalm 145:3", "Nehemiah 9:6"], themes: ["Praise & adoration", "Creation"] },
  "yeshua": { refs: ["Matthew 1:21", "Acts 4:12"], themes: ["Salvation"] },
  "god defend new zealand (national anthem)": { refs: ["Psalm 33:12", "Proverbs 14:34"], themes: ["Mission"] },
  "worthy of it all": { refs: ["Revelation 4:11", "Revelation 5:12"], themes: ["Worship", "Surrender"] },
  "let it rain": { refs: ["Hosea 6:3", "James 5:7"], themes: ["Holy Spirit", "Hope"] },
  "amazing grace": { refs: ["Ephesians 2:8-9", "John 9:25"], themes: ["Grace", "Salvation"] },
  "living hope": { refs: ["1 Peter 1:3", "Romans 6:4"], themes: ["Hope", "Resurrection"] },
  "god is among us": { refs: ["Zephaniah 3:17", "Matthew 1:23"], themes: ["God's presence", "Hope"] },
  "god of revival": { refs: ["Habakkuk 3:2", "Psalm 85:6"], themes: ["Holy Spirit", "Hope"] },
  "hallelujah (praise the lord)": { refs: ["Psalm 150", "Revelation 19:1"], themes: ["Praise & adoration"] },
  "no body": { refs: ["Psalm 73:25", "Isaiah 45:5"], themes: ["Worship", "Trust"] },
  "holy is he": { refs: ["Isaiah 6:3", "Revelation 4:8"], themes: ["Holiness", "Worship"] },
  "here i am to worship": { refs: ["John 1:9-14", "Psalm 95:6"], themes: ["Worship", "Surrender"] },
  "good grace": { refs: ["Ephesians 2:8", "Psalm 133"], themes: ["Grace", "Identity in Christ"] },
  "alpha and omega": { refs: ["Revelation 22:13", "Revelation 1:8"], themes: ["Worship", "Holiness"] },
  "he is risen": { refs: ["Matthew 28:6", "1 Corinthians 15:20"], themes: ["Resurrection", "Hope"] },
  "victory is yours": { refs: ["1 Corinthians 15:57", "Romans 8:37"], themes: ["Hope", "Freedom"] },
};

const DEFAULT = { refs: ["Psalm 150"], themes: ["Praise & adoration"] };

(async () => {
  const db = getDb();
  const slots = await db.select().from(songSlots);
  const titles = [...new Set(slots.map((s) => s.title.trim()))];

  let matched = 0;
  let defaulted = 0;
  for (const title of titles) {
    const hit = MAP[base(title)];
    if (hit) matched++;
    else defaulted++;
    const t = hit ?? DEFAULT;
    await db
      .insert(songTags)
      .values({ title: title.toLowerCase(), displayTitle: title, themes: t.themes, scriptureRefs: t.refs, status: "needs_review", taggedBy: "Starter pass (AI-drafted)" })
      .onConflictDoUpdate({ target: songTags.title, set: { displayTitle: title, themes: t.themes, scriptureRefs: t.refs } });
  }
  console.log(`✓ tagged ${titles.length} songs — ${matched} matched, ${defaulted} used default (all needs_review)`);
  await db.$client.end?.();
  process.exit(0);
})();

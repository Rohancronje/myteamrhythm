// Seeds a sample team reading plan (Genesis arc) starting today. Passages are a
// DRAFT example — per the handover, real weekly passages need sign-off from
// whoever's preaching. WEB (public-domain) so full text is safe to display.
import { readFileSync } from "node:fs";
import { getDb } from "../src/db";
import { readingPlan } from "../src/db/schema";
import { sql } from "drizzle-orm";

function loadEnv(path: string) {
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) process.env[m[1]] ??= m[2];
  }
}
loadEnv(".env.local");

const SERIES = "Genesis";
const REFS = [
  "Genesis 1:1-25", "Genesis 1:26-2:3", "Genesis 2:4-25", "Genesis 3", "Genesis 4:1-16",
  "Genesis 6:9-22", "Genesis 7", "Genesis 8", "Genesis 9:1-17", "Genesis 11:1-9",
  "Genesis 12:1-9", "Genesis 15", "Genesis 17:1-8", "Genesis 22:1-19",
];

function isoPlus(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

(async () => {
  const db = getDb();
  const base = new Date();
  const rows = REFS.map((reference, i) => ({ day: isoPlus(base, i), reference, seriesTitle: SERIES }));
  for (const r of rows) {
    await db.insert(readingPlan).values(r).onConflictDoUpdate({ target: readingPlan.day, set: { reference: r.reference, seriesTitle: r.seriesTitle } });
  }
  console.log(`✓ seeded ${rows.length}-day reading plan "${SERIES}" from ${rows[0].day}`);
  await db.$client.end?.();
  process.exit(0);
})();

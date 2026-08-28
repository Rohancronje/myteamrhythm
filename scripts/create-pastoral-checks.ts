// One-off: create the pastoral_checks table (structured follow-up ticks, no notes).
// Idempotent — safe to run more than once. Run: pnpm tsx scripts/create-pastoral-checks.ts
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { getDb } from "../src/db";

function loadEnv(path: string) {
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) process.env[m[1]] ??= m[2];
  }
}
loadEnv(".env.local");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

(async () => {
  try {
    await getDb().execute(sql`
      CREATE TABLE IF NOT EXISTS pastoral_checks (
        pco_id      text PRIMARY KEY,
        reached_out boolean NOT NULL DEFAULT false,
        checked_in  boolean NOT NULL DEFAULT false,
        outcome     text,
        updated_by  text,
        updated_at  timestamp NOT NULL DEFAULT now()
      )
    `);
    console.log("✓ pastoral_checks ready");
  } catch (e) {
    console.error("failed:", (e as Error).message);
    process.exit(1);
  }
  process.exit(0);
})();

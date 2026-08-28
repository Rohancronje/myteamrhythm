// One-off: create the coach "connect" tables + add users.teams. Idempotent.
// Run: pnpm tsx scripts/create-connect-tables.ts
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

(async () => {
  const db = getDb();
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS teams jsonb DEFAULT '[]'::jsonb`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS person_contacts (
      pco_id     text PRIMARY KEY,
      email      text,
      phone      text,
      birthday   date,
      source     text NOT NULL DEFAULT 'manual',
      updated_by text,
      updated_at timestamp NOT NULL DEFAULT now()
    )`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS connections (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pco_id       text NOT NULL,
      coach_email  text NOT NULL,
      note         text,
      contacted_at timestamp NOT NULL DEFAULT now()
    )`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS connections_pco_idx ON connections (pco_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS connections_coach_idx ON connections (coach_email)`);
  console.log("✓ connect tables ready (users.teams, person_contacts, connections)");
  process.exit(0);
})();

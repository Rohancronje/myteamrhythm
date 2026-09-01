// One-off: create the audit_log table. Idempotent + additive — safe to run against
// the live DB with zero downtime (it only adds a table nothing else depends on).
// Run: pnpm tsx scripts/create-audit-table.ts
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
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      at           timestamp NOT NULL DEFAULT now(),
      actor_email  text,
      actor_name   text,
      action       text NOT NULL,
      target       text,
      detail       text
    )`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS audit_at_idx ON audit_log (at)`);
  console.log("✓ audit_log table ready");
  process.exit(0);
})();

// One-off: create the `reminders` + `notifications` tables. Idempotent.
// Run: pnpm tsx scripts/create-reminder-tables.ts
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
    CREATE TABLE IF NOT EXISTS reminders (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      member_id     uuid NOT NULL REFERENCES team_members (id) ON DELETE CASCADE,
      coach_email   text NOT NULL,
      title         text NOT NULL,
      remind_on     date NOT NULL,
      recurring     boolean NOT NULL DEFAULT false,
      last_fired_on date,
      created_at    timestamp NOT NULL DEFAULT now()
    )`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS reminders_member_idx ON reminders (member_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS reminders_coach_idx ON reminders (coach_email)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_email text NOT NULL,
      kind       text NOT NULL DEFAULT 'reminder',
      title      text NOT NULL,
      body       text,
      href       text,
      read_at    timestamp,
      created_at timestamp NOT NULL DEFAULT now()
    )`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_email, read_at)`);

  console.log("✓ reminder tables ready (reminders, notifications)");
  process.exit(0);
})();

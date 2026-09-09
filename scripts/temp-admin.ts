// Creates (or resets) a TEMPORARY admin login so the UI can be screenshotted for a
// design pass, then deleted. Run: pnpm tsx scripts/temp-admin.ts [create|delete]
import { readFileSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "../src/db";

function loadEnv(path: string) {
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) process.env[m[1]] ??= m[2];
  }
}
loadEnv(".env.local");

const EMAIL = "uireview@example.com";
const PASSWORD = "ui-review-temp-2026";

(async () => {
  const db = getDb();
  const mode = process.argv[2] ?? "create";
  if (mode === "delete") {
    await db.execute(sql`DELETE FROM users WHERE email = ${EMAIL}`);
    console.log("✓ temp admin deleted");
  } else {
    const salt = randomBytes(16).toString("hex");
    const hash = "scrypt:" + salt + ":" + scryptSync(PASSWORD, salt, 64).toString("hex");
    await db.execute(sql`
      INSERT INTO users (email, name, role, password_hash, can_post_events, can_post_resources)
      VALUES (${EMAIL}, 'UI Review', 'admin', ${hash}, true, true)
      ON CONFLICT (email) DO UPDATE SET password_hash = ${hash}, role = 'admin'`);
    console.log(`✓ temp admin ready: ${EMAIL} / ${PASSWORD}`);
  }
  process.exit(0);
})();

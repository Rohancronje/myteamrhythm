// Add (or update) an app account in the DB.
// Usage: pnpm tsx scripts/add-user.ts <email> "<name>" <admin|leader|member> "<password>" [personId]
import { readFileSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";
import { writeUsers } from "../src/db/writers";

function loadEnv(path: string) {
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) process.env[m[1]] ??= m[2];
  }
}
loadEnv(".env.local");

const [email, name, role, password, personId] = process.argv.slice(2);
if (!email || !name || !role || !password) {
  console.error('Usage: add-user.ts <email> "<name>" <admin|leader|member> "<password>" [personId]');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = "scrypt:" + salt + ":" + scryptSync(password, salt, 64).toString("hex");

(async () => {
  await writeUsers([{ email: email.toLowerCase(), name, role, personId: personId ?? null, passwordHash: hash }]);
  console.log(`✓ ${email} (${role}) added/updated`);
  process.exit(0);
})();

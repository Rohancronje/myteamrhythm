// Set the teams a user coaches (keeps their existing role).
// Usage: pnpm tsx scripts/assign-teams.ts <email> "<Team A>" ["<Team B>" ...]
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { users } from "../src/db/schema";
function loadEnv(p: string) { for (const l of readFileSync(p, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !l.trim().startsWith("#")) process.env[m[1]] ??= m[2]; } }
loadEnv(".env.local");

const [email, ...teams] = process.argv.slice(2);
if (!email || teams.length === 0) { console.error('Usage: assign-teams.ts <email> "<Team>" ...'); process.exit(1); }

(async () => {
  const res = await getDb().update(users).set({ teams }).where(eq(users.email, email.toLowerCase()));
  console.log(res.count ? `✓ ${email} → teams: ${teams.join(", ")}` : `no such user: ${email}`);
  process.exit(0);
})();

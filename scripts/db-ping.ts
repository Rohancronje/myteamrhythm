// Quick Supabase connectivity check. Tries both pooler ports.
import { readFileSync } from "node:fs";
import postgres from "postgres";

function loadEnv(path: string) {
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) process.env[m[1]] ??= m[2];
  }
}
loadEnv(".env.local");

async function tryUrl(label: string, url: string | undefined) {
  if (!url) return console.log(`${label}: (not set)`);
  const sql = postgres(url, { prepare: false, connect_timeout: 12 });
  try {
    const r = await sql`select 1 as ok, current_database() as db, version() as v`;
    console.log(`${label}: ✓ connected · db=${r[0].db} · ${String(r[0].v).slice(0, 30)}…`);
  } catch (e) {
    console.log(`${label}: ✗ ${(e as Error).message}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

(async () => {
  await tryUrl("session pooler (5432)", process.env.DATABASE_URL_SESSION);
  await tryUrl("transaction pooler (6543)", process.env.DATABASE_URL);
})();

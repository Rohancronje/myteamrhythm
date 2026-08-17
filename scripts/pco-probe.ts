// Phase-0 live probe. Reads .env.local, verifies the Planning Center token, and
// lists service types so we can build PCO_SERVICE_TYPE_MAP.
// Run: pnpm tsx scripts/pco-probe.ts
import { readFileSync } from "node:fs";
import { PcoClient } from "../src/lib/pco/client";

// Minimal .env.local loader (no dependency).
function loadEnv(path: string) {
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith("#")) process.env[m[1]] ??= m[2];
    }
  } catch {
    /* ignore */
  }
}

loadEnv(".env.local");

const appId = process.env.PCO_APP_ID;
const secret = process.env.PCO_SECRET;
if (!appId || !secret) {
  console.error("Missing PCO_APP_ID / PCO_SECRET in .env.local");
  process.exit(1);
}

const client = new PcoClient({ appId, secret, serviceTypeMap: {} });

(async () => {
  console.log("Connecting to Planning Center Services API…\n");
  try {
    const types = await client.listServiceTypes();
    console.log(`✓ Authenticated. Found ${types.length} service type(s):\n`);
    for (const t of types) console.log(`  ${t.id}  ${t.name}`);

    // Try to guess the NS Family Services mapping.
    const guess = (re: RegExp) => types.find((t) => re.test(t.name))?.id;
    const map = {
      sunday_am: guess(/sunday.*(a\.?m|morning)/i),
      sunday_pm: guess(/sunday.*(p\.?m|evening|night)/i),
      wednesday_night: guess(/wed/i),
    };
    console.log("\nSuggested PCO_SERVICE_TYPE_MAP (verify names first):");
    const parts = Object.entries(map)
      .filter(([, id]) => id)
      .map(([k, id]) => `${id}:${k}`);
    console.log("  " + (parts.join(",") || "(no obvious matches — set manually)"));
  } catch (e) {
    console.error("✗ Probe failed:", (e as Error).message);
    process.exit(1);
  }
})();

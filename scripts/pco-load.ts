// Phase-0 proof: pull real NS Family Services roster history and run it through
// the Rhythm engine. Confirms the load signal exists in the actual data before
// we build persistence on top. Run: pnpm tsx scripts/pco-load.ts
import { readFileSync } from "node:fs";
import { PcoClient, type PcoConfig } from "../src/lib/pco/client";
import { DEFAULT_CONFIG, computePersonRhythm } from "../src/lib/rhythm/acwr";
import { computeSignal } from "../src/lib/rhythm/wellbeing";
import { ZONE_META } from "../src/lib/rhythm/presentation";
import type { ServingEvent, ServiceTypeKey } from "../src/lib/rhythm/types";

function loadEnv(path: string) {
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) process.env[m[1]] ??= m[2];
  }
}
loadEnv(".env.local");

function parseMap(raw?: string): Record<string, ServiceTypeKey> {
  const out: Record<string, ServiceTypeKey> = {};
  for (const pair of (raw ?? "").split(",")) {
    const [id, key] = pair.split(":").map((s) => s.trim());
    if (id && key) out[id] = key as ServiceTypeKey;
  }
  return out;
}

const config: PcoConfig = {
  appId: process.env.PCO_APP_ID!,
  secret: process.env.PCO_SECRET!,
  serviceTypeMap: parseMap(process.env.PCO_SERVICE_TYPE_MAP),
};

const WEEKS = 12;
const since = new Date();
since.setUTCDate(since.getUTCDate() - WEEKS * 7);
const sinceISO = since.toISOString().slice(0, 10);

(async () => {
  const client = new PcoClient(config);
  console.log(`Pulling NS Family Services rosters since ${sinceISO} (${WEEKS} weeks)…\n`);

  const rows = await client.fetchScheduledSince(sinceISO, (m) => console.log("  " + m));

  console.log(`\n✓ ${rows.length} assignments pulled.`);
  const byPerson = new Map<string, { name: string; events: ServingEvent[] }>();
  for (const r of rows) {
    const rec = byPerson.get(r.personId) ?? { name: r.personName, events: [] };
    rec.events.push({
      personId: r.personId,
      serviceType: r.serviceType,
      date: r.date,
      status: r.status,
    });
    byPerson.set(r.personId, rec);
  }
  console.log(`✓ ${byPerson.size} distinct volunteers.\n`);

  const ranked = [...byPerson.entries()]
    .map(([id, rec]) => {
      const rhythm = computePersonRhythm(id, rec.events, DEFAULT_CONFIG, { from: since });
      const signal = computeSignal(rhythm, null);
      return { name: rec.name, serves: rec.events.length, rhythm, signal };
    })
    .sort((a, b) => b.serves - a.serves);

  console.log("Top servers by real serving load:\n");
  console.log("  serves  ACWR   zone       name");
  for (const p of ranked.slice(0, 15)) {
    const acwr = p.rhythm.currentAcwr;
    console.log(
      `  ${String(p.serves).padStart(6)}  ${(acwr?.toFixed(2) ?? " -- ").padStart(5)}  ` +
        `${ZONE_META[p.rhythm.zone].label.padEnd(9)}  ${p.name}`,
    );
  }

  const flagged = ranked.filter((p) => p.rhythm.zone === "climbing" || p.rhythm.zone === "spiking");
  console.log(`\n${flagged.length} volunteer(s) currently climbing or spiking on load alone.`);
  console.log("(Add pulse check-ins to turn this into a real leading indicator.)");
})();

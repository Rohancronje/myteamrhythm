// Probe: does the Services API expose setlist/song data for NS plans? The
// handover said Song Intelligence needs a setlist export that the roster CSV
// lacks — but the API's plan items should carry it. Confirm before building.
import { readFileSync } from "node:fs";
import { PcoClient, type PcoConfig } from "../src/lib/pco/client";
import type { ServiceTypeKey } from "../src/lib/rhythm/types";

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

const AM = Object.entries(config.serviceTypeMap).find(([, k]) => k === "sunday_am")?.[0]!;

(async () => {
  const client = new PcoClient(config);
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 6 * 7);
  const plans = await client.listPastPlans(AM, since.toISOString().slice(0, 10));
  console.log(`Sunday AM plans in last 6 weeks: ${plans.length}\n`);

  for (const plan of plans.slice(0, 4)) {
    const items = await client.planItems(AM, plan.id);
    const members = await client.planTeamMembers(AM, plan.id);
    const leader = members.find((m) => /worship\s*lead|^lead|music director/i.test(m.position))?.personName ?? "—";
    console.log(`${plan.date}  ·  leader: ${leader}  ·  ${items.length} songs`);
    for (const s of items) console.log(`   ♪ ${s.title}${s.key ? ` (${s.key})` : ""}${s.bpm ? ` ${s.bpm}bpm` : ""}${s.author ? ` — ${s.author}` : ""}`);
    console.log("");
  }
})();

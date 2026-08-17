// Syncs UPCOMING services (next few weeks) for the "your next service" view:
// future plans + call times + roster + setlist. Writes .data/pco-upcoming.json
// and (when DATABASE_URL is set) the upcoming_services table.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

const WEEKS = Number(process.argv[2] ?? 6);
const until = new Date();
until.setUTCDate(until.getUTCDate() + WEEKS * 7);
const untilISO = until.toISOString().slice(0, 10);

(async () => {
  const client = new PcoClient(config);
  console.log(`Syncing upcoming services through ${untilISO}…\n`);

  const services: {
    planId: string;
    serviceDate: string;
    serviceType: string;
    title: string;
    seriesTitle: string;
    data: {
      times: { name: string; startsAt: string; timeType: string }[];
      roster: { pcoId: string; name: string; position: string; team: string; status: string }[];
      songs: { title: string; key: string; bpm: number | null; position: number }[];
    };
  }[] = [];

  for (const [pcoId, key] of Object.entries(config.serviceTypeMap)) {
    const plans = await client.listFuturePlans(pcoId, untilISO);
    console.log(`  ${key}: ${plans.length} upcoming plans`);
    for (const plan of plans) {
      const [times, members, songs] = await Promise.all([
        client.planTimes(pcoId, plan.id),
        client.planTeamMembers(pcoId, plan.id),
        client.planItems(pcoId, plan.id),
      ]);
      services.push({
        planId: plan.id,
        serviceDate: plan.date,
        serviceType: key,
        title: plan.title,
        seriesTitle: plan.seriesTitle,
        data: {
          times,
          roster: members.filter((m) => m.personId && m.status !== "declined").map((m) => ({
            pcoId: m.personId,
            name: m.personName,
            position: m.position,
            team: m.team,
            status: m.status,
          })),
          songs: songs.map((s, i) => ({ title: s.title, key: s.key, bpm: s.bpm == null ? null : Math.round(s.bpm), position: i })),
        },
      });
    }
  }

  const snapshot = { generatedAt: new Date().toISOString(), windowWeeks: WEEKS, org: "City Impact · NS Family Services", services };
  mkdirSync(".data", { recursive: true });
  writeFileSync(".data/pco-upcoming.json", JSON.stringify(snapshot, null, 2));
  console.log(`\n✓ Wrote .data/pco-upcoming.json — ${services.length} upcoming services.`);

  if (process.env.DATABASE_URL) {
    const { writeUpcoming } = await import("../src/db/writers");
    await writeUpcoming(
      services.map((s) => ({ planId: s.planId, serviceDate: s.serviceDate, serviceType: s.serviceType, title: s.title, seriesTitle: s.seriesTitle, data: s.data })),
      { windowWeeks: WEEKS, services: services.length },
    );
    console.log(`✓ Wrote ${services.length} upcoming services to Postgres.`);
  }
  process.exit(0);
})();

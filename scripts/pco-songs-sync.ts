// Song Intelligence sync (handover Part B). Pulls setlists + worship leader per
// plan across all mapped service types and writes .data/pco-songs.json (git-
// ignored). Made possible by the Services API plan-items endpoints — beyond what
// the roster CSV could offer.
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

const WEEKS = Number(process.argv[2] ?? 24);
const anchor = new Date();
const since = new Date(anchor);
since.setUTCDate(since.getUTCDate() - WEEKS * 7);
const sinceISO = since.toISOString().slice(0, 10);

function leaderOf(members: { personName: string; position: string }[]): string | null {
  const lead = members.find((m) => /worship\s*lead|music director|^lead vocal|^lead$/i.test(m.position));
  return lead?.personName ?? null;
}

(async () => {
  const client = new PcoClient(config);
  console.log(`Syncing setlists since ${sinceISO} (${WEEKS} weeks)…\n`);

  const services: {
    date: string;
    serviceType: ServiceTypeKey;
    planId: string;
    leader: string | null;
    songs: { songId: string; title: string; author: string; key: string; bpm: number | null }[];
  }[] = [];

  for (const [pcoId, key] of Object.entries(config.serviceTypeMap)) {
    const plans = await client.listPastPlans(pcoId, sinceISO);
    console.log(`  ${key}: ${plans.length} plans`);
    for (const plan of plans) {
      const [songs, members] = await Promise.all([
        client.planItems(pcoId, plan.id),
        client.planTeamMembers(pcoId, plan.id),
      ]);
      if (songs.length === 0) continue;
      services.push({ date: plan.date, serviceType: key, planId: plan.id, leader: leaderOf(members), songs });
    }
  }

  const snapshot = {
    generatedAt: anchor.toISOString(),
    anchor: anchor.toISOString().slice(0, 10),
    windowWeeks: WEEKS,
    org: "City Impact · NS Family Services",
    services,
  };

  mkdirSync(".data", { recursive: true });
  writeFileSync(".data/pco-songs.json", JSON.stringify(snapshot, null, 2));
  const totalSongs = services.reduce((n, s) => n + s.songs.length, 0);
  console.log(`\n✓ Wrote .data/pco-songs.json — ${services.length} services, ${totalSongs} song slots.`);

  if (process.env.DATABASE_URL) {
    const { writeSongs } = await import("../src/db/writers");
    const serviceRows = services.map((s) => ({ planId: s.planId, serviceDate: s.date, serviceType: s.serviceType, leader: s.leader }));
    const slotRows = services.flatMap((s) =>
      s.songs.map((song, i) => ({
        planId: s.planId,
        songId: song.songId,
        title: song.title,
        author: song.author,
        keyName: song.key,
        bpm: song.bpm == null ? null : Math.round(song.bpm),
        position: i,
      })),
    );
    await writeSongs(serviceRows, slotRows, { windowWeeks: WEEKS, services: services.length, slots: slotRows.length });
    console.log(`✓ Wrote ${serviceRows.length} services + ${slotRows.length} song slots to Postgres.`);
  }
  process.exit(0);
})();

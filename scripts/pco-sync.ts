// Syncs real Planning Center roster history into a local snapshot the app reads.
// This is the no-database path: it writes .data/pco-snapshot.json (git-ignored —
// it contains real names). Swap for the Postgres sync once DATABASE_URL is set.
//
// Run: pnpm tsx scripts/pco-sync.ts        (defaults to 26 weeks)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PcoClient, type PcoConfig } from "../src/lib/pco/client";
import { pseudonymFor } from "../src/lib/pco/pseudonym";
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

const WEEKS = Number(process.argv[2] ?? 26);
const anchor = new Date();
const since = new Date(anchor);
since.setUTCDate(since.getUTCDate() - WEEKS * 7);
const sinceISO = since.toISOString().slice(0, 10);

function mode<T>(xs: T[]): T | undefined {
  const counts = new Map<T, number>();
  let best: T | undefined;
  let bestN = 0;
  for (const x of xs) {
    const n = (counts.get(x) ?? 0) + 1;
    counts.set(x, n);
    if (n > bestN) {
      bestN = n;
      best = x;
    }
  }
  return best;
}

(async () => {
  const client = new PcoClient(config);
  console.log(`Syncing ${WEEKS} weeks of NS Family Services since ${sinceISO}…\n`);
  const rows = await client.fetchScheduledSince(sinceISO, (m) => console.log("  " + m));

  const byPerson = new Map<
    string,
    { name: string; teams: string[]; roles: string[]; events: { serviceType: string; date: string; planId: string; status: string; position: string }[] }
  >();
  for (const r of rows) {
    const rec = byPerson.get(r.personId) ?? { name: r.personName, teams: [], roles: [], events: [] };
    rec.teams.push(r.team);
    rec.roles.push(r.position || "Team");
    rec.events.push({ serviceType: r.serviceType, date: r.date, planId: r.planId, status: r.status, position: r.position });
    byPerson.set(r.personId, rec);
  }

  const people = [...byPerson.entries()].map(([pcoId, rec]) => ({
    pcoId,
    handle: pseudonymFor(pcoId),
    name: rec.name,
    team: mode(rec.teams) ?? "Unassigned",
    role: mode(rec.roles) ?? "Team",
    events: rec.events,
  }));

  const snapshot = {
    generatedAt: anchor.toISOString(),
    anchor: anchor.toISOString().slice(0, 10),
    windowWeeks: WEEKS,
    source: "planning-center",
    org: "City Impact · NS Family Services",
    assignments: rows.length,
    people,
  };

  mkdirSync(".data", { recursive: true });
  writeFileSync(".data/pco-snapshot.json", JSON.stringify(snapshot, null, 2));
  console.log(`\n✓ Wrote .data/pco-snapshot.json — ${people.length} volunteers, ${rows.length} assignments.`);

  if (process.env.DATABASE_URL) {
    const { writeRoster } = await import("../src/db/writers");
    const personRows = people.map((p) => ({ pcoId: p.pcoId, name: p.name, handle: p.handle, team: p.team, role: p.role }));
    const seen = new Set<string>();
    const eventRows = rows
      .map((r) => ({ pcoId: r.personId, serviceType: r.serviceType, serviceDate: r.date, planId: r.planId, status: r.status, position: r.position || "" }))
      .filter((e) => {
        const k = `${e.pcoId}|${e.planId}|${e.position}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    await writeRoster(personRows, eventRows, { windowWeeks: WEEKS, people: personRows.length, assignments: eventRows.length });
    console.log(`✓ Wrote ${personRows.length} people + ${eventRows.length} events to Postgres.`);
  }
  process.exit(0);
})();

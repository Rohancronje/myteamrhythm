// Sanity-check the handover load rules against the real snapshot.
import { readFileSync } from "node:fs";
import { assess, type PersonEvent } from "../src/lib/rhythm/assess";

const snap = JSON.parse(readFileSync(".data/pco-snapshot.json", "utf8")) as {
  people: { name: string; team: string; events: PersonEvent[] }[];
};
const now = new Date();

const rows = snap.people
  .map((p) => ({ name: p.name, team: p.team, a: assess(p.events, now, 26) }))
  .filter((r) => r.a.recentlyActive);

const dist = { steady: 0, watch: 0, elevated: 0 };
for (const r of rows) dist[r.a.status]++;

console.log(`Active volunteers: ${rows.length}`);
console.log(`Status → Steady ${dist.steady} · Watch ${dist.watch} · Elevated ${dist.elevated}\n`);

console.log("Top flagged (Elevated first):");
rows
  .filter((r) => r.a.status !== "steady")
  .sort((a, b) => (b.a.status === "elevated" ? 1 : 0) - (a.a.status === "elevated" ? 1 : 0) || b.a.streakWeeks - a.a.streakWeeks)
  .slice(0, 12)
  .forEach((r) =>
    console.log(`  [${r.a.status.toUpperCase().padEnd(8)}] ${r.name.padEnd(24)} — ${r.a.reason}`),
  );

// Dedupe proof: max services in a single week should be small (≤ ~4), not inflated.
const maxWeek = Math.max(...rows.map((r) => Math.max(...r.a.weeklyDots.map((_, i) => 0), r.a.servicesThisWeek)));
console.log(`\nLongest current streak: ${Math.max(...rows.map((r) => r.a.streakWeeks))} weeks`);
console.log(`Sample dot row (newest 26 wks): ${rows[0].a.weeklyDots.map((d) => (d ? "●" : "·")).join("")}`);

// Pressure-test the burnout/load model against the LIVE roster, with the same NZ
// anchor production uses. Prints the distribution plus the checks that actually
// tell us if the flags are trustworthy: misses (heavy servers marked healthy) and
// thin flags (flagged on very little real load).
// Run: pnpm tsx scripts/pressuretest-assess.ts
import { readFileSync } from "node:fs";

function loadEnv(path: string) {
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) process.env[m[1]] ??= m[2];
  }
}
loadEnv(".env.local");

(async () => {
  const { readRosterSnapshot } = await import("../src/db/read");
  const { assess } = await import("../src/lib/rhythm/assess");
  const { nzNowAnchor } = await import("../src/lib/time");

  const snap = await readRosterSnapshot();
  const now = nzNowAnchor();
  const rows = snap.people
    .map((p) => ({ name: p.name, team: p.team, a: assess(p.events, now, 26) }))
    .filter((r) => r.a.recentlyActive);

  const dist = { steady: 0, watch: 0, elevated: 0 };
  for (const r of rows) dist[r.a.status]++;
  const flagged = rows.filter((r) => r.a.status !== "steady");

  console.log(`\n=== LOAD MODEL PRESSURE TEST (anchor ${now.toISOString().slice(0, 10)}) ===`);
  console.log(`People in roster: ${snap.people.length}   ·   recently active: ${rows.length}`);
  console.log(`  Healthy    ${dist.steady}`);
  console.log(`  Watch      ${dist.watch}`);
  console.log(`  Heavy load ${dist.elevated}`);
  console.log(`  Flagged total: ${flagged.length} (${Math.round((flagged.length / rows.length) * 100)}% of active)`);

  // Why are people flagged? (weekly-load vs streak-only)
  const byWeekly = flagged.filter((r) => r.a.heavyWeeksRecent >= 1 || r.a.servicesThisWeek >= 3).length;
  const byStreakOnly = flagged.filter((r) => r.a.heavyWeeksRecent === 0 && r.a.servicesThisWeek < 3 && r.a.streakWeeks >= 6).length;
  console.log(`\nFlag drivers: heavy-week load ${byWeekly} · long-streak only ${byStreakOnly}`);

  // MISS CHECK: busiest people (by total services) who are NOT flagged.
  console.log(`\n--- Busiest 12 by total services (● = flagged) ---`);
  [...rows].sort((a, b) => b.a.totalServices - a.a.totalServices).slice(0, 12).forEach((r) => {
    const mark = r.a.status !== "steady" ? "●" : "·";
    console.log(`  ${mark} ${String(r.a.totalServices).padStart(3)} svc  streak ${String(r.a.streakWeeks).padStart(2)}  [${r.a.status}] ${r.name}`);
  });

  // THIN-FLAG CHECK: flagged people with low total services (possible false positive).
  const thin = flagged.filter((r) => r.a.totalServices <= 6).sort((a, b) => a.a.totalServices - b.a.totalServices);
  console.log(`\n--- Flagged but low total load (<=6 services in 26wks): ${thin.length} ---`);
  thin.slice(0, 10).forEach((r) =>
    console.log(`  ${String(r.a.totalServices).padStart(2)} svc  streak ${String(r.a.streakWeeks).padStart(2)}  heavyWks ${r.a.heavyWeeksRecent}  [${r.a.status}] ${r.name} — ${r.a.reason}`),
  );

  // The actual Heavy-load list.
  console.log(`\n--- HEAVY LOAD (${rows.filter((r) => r.a.status === "elevated").length}) ---`);
  rows.filter((r) => r.a.status === "elevated")
    .sort((a, b) => b.a.streakWeeks - a.a.streakWeeks)
    .forEach((r) => console.log(`  ${r.name.padEnd(26)} streak ${String(r.a.streakWeeks).padStart(2)}  thisWk ${r.a.servicesThisWeek}  heavyWks ${r.a.heavyWeeksRecent}  — ${r.a.reason}`));

  console.log(`\nLongest current streak: ${Math.max(...rows.map((r) => r.a.streakWeeks))} weeks`);
  process.exit(0);
})();

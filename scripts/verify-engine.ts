// Quick engine sanity checks. Run: pnpm tsx scripts/verify-engine.ts
import {
  DEFAULT_CONFIG,
  computePersonRhythm,
  isoWeekStart,
  toISODate,
} from "../src/lib/rhythm/acwr";
import { computePulseTrend, computeSignal } from "../src/lib/rhythm/wellbeing";
import type { ServingEvent, PulseResponse } from "../src/lib/rhythm/types";

let failed = 0;
function assert(name: string, cond: boolean, detail?: unknown) {
  const mark = cond ? "PASS" : "FAIL";
  if (!cond) failed++;
  console.log(`  [${mark}] ${name}${detail !== undefined && !cond ? ` → ${JSON.stringify(detail)}` : ""}`);
}

// ISO week starts on Monday
const wed = new Date("2026-08-19T00:00:00Z"); // a Wednesday
assert("isoWeekStart lands on Monday", toISODate(isoWeekStart(wed)) === "2026-08-17");

// A steady 1/week server sits near ACWR 1.0
function weekly(personId: string, weeks: number, from: string): ServingEvent[] {
  const out: ServingEvent[] = [];
  const start = new Date(from + "T00:00:00Z");
  for (let i = 0; i < weeks; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i * 7);
    out.push({ personId, serviceType: "sunday_am", date: d.toISOString().slice(0, 10), status: "confirmed" });
  }
  return out;
}

const steady = computePersonRhythm("steady", weekly("steady", 20, "2026-03-30"), DEFAULT_CONFIG);
assert("steady server ACWR ≈ 1.0", steady.currentAcwr !== null && Math.abs(steady.currentAcwr - 1) < 0.05, steady.currentAcwr);
assert("steady server zone is steady", steady.zone === "steady", steady.zone);

// A spike: normal for 12 weeks, then triple load for 3 weeks
const base = weekly("spike", 12, "2026-03-30");
const spikeStart = new Date("2026-06-22T00:00:00Z");
const extra: ServingEvent[] = [];
for (let i = 0; i < 3; i++) {
  const d = new Date(spikeStart);
  d.setUTCDate(d.getUTCDate() + i * 7);
  const iso = d.toISOString().slice(0, 10);
  extra.push({ personId: "spike", serviceType: "sunday_am", date: iso, status: "confirmed" });
  extra.push({ personId: "spike", serviceType: "sunday_pm", date: iso, status: "confirmed" });
  const wd = new Date(d); wd.setUTCDate(wd.getUTCDate() + 3);
  extra.push({ personId: "spike", serviceType: "wednesday_night", date: wd.toISOString().slice(0, 10), status: "confirmed" });
}
const spike = computePersonRhythm("spike", [...base, ...extra], DEFAULT_CONFIG);
assert("spike server ACWR > 1.3", spike.currentAcwr !== null && spike.currentAcwr > 1.3, spike.currentAcwr);
assert("spike server flagged climbing/spiking", spike.zone === "climbing" || spike.zone === "spiking", spike.zone);

// Cross-reference: high load + falling feeling → priority
const fallingPulses: PulseResponse[] = [5, 5, 4, 4, 3, 2].map((v, i) => ({
  participantId: "spike",
  date: `2026-0${i < 3 ? "6" : "7"}-${10 + i}`,
  energy: v, meaning: v,
}));
const trend = computePulseTrend(fallingPulses);
assert("falling pulse trend has negative slope", trend.slope < 0, trend.slope);
const signal = computeSignal(spike, trend);
assert("high load + falling feeling → priority", signal.attention === "priority", signal.attention);

// Thriving guard: high load but steady good feeling → NOT priority
const steadyPulses: PulseResponse[] = [4, 5, 4, 5, 4, 5].map((v, i) => ({
  participantId: "spike", date: `2026-07-0${i + 1}`, energy: v, meaning: v, connection: v,
}));
const thrivingSignal = computeSignal(spike, computePulseTrend(steadyPulses));
assert("high load + steady feeling ≠ priority (false-positive guard)", thrivingSignal.attention !== "priority", thrivingSignal.attention);

console.log(failed === 0 ? "\nAll engine checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);

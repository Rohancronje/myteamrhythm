// Team-level insight derivations. Turns the per-person rhythm data into the
// non-obvious, at-a-glance signals a pastoral lead actually wants: where people
// sit on the load × feeling plane, how team load is trending, and who moved most
// this week. Pure functions over the seeded/synced dataset.

import type { SeededPerson } from "@/lib/data/seed";
import type { AttentionLevel } from "./wellbeing";

export interface MatrixPoint {
  id: string;
  handle: string;
  acwr: number;
  feeling: number;
  attention: AttentionLevel;
  /** 4-week change in ACWR — the movement, not just the level. */
  loadDelta: number;
}

export interface TeamInsights {
  /** Median ACWR per week across the team, last N weeks. */
  loadTrend: { weekStart: string; median: number | null }[];
  /** Each person positioned on the load × feeling plane. */
  matrix: MatrixPoint[];
  /** Biggest upward load movers this window. */
  movers: { id: string; handle: string; delta: number; acwr: number | null }[];
  /** Share of the team whose feeling is trending down. */
  fallingShare: number;
  /** Week-over-week change in how many people are in the danger corner. */
  dangerNow: number;
  dangerPrev: number;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** ACWR `weeksAgo` back from the person's effective "now" (0 = current). */
function acwrAgo(p: SeededPerson, weeksAgo: number): number | null {
  const s = p.rhythm.series;
  return s[p.rhythm.currentIndex - weeksAgo]?.acwr ?? null;
}

export function buildInsights(data: SeededPerson[], trendWeeks = 12): TeamInsights {
  // Team load trend: median ACWR among people ACTUALLY SERVING each week. Across
  // an intermittent-volunteer population, averaging in everyone who's resting that
  // week just drags the line toward zero and hides the signal.
  const maxLen = Math.max(...data.map((p) => p.rhythm.series.length));
  const loadTrend: { weekStart: string; median: number | null }[] = [];
  for (let i = maxLen - trendWeeks; i < maxLen; i++) {
    if (i < 0) continue;
    const week = data.find((p) => p.rhythm.series[i])?.rhythm.series[i]?.weekStart;
    const vals = data
      .filter((p) => (p.rhythm.series[i]?.rawLoad ?? 0) > 0)
      .map((p) => p.rhythm.series[i]?.acwr)
      .filter((x): x is number => x != null);
    loadTrend.push({ weekStart: week ?? `${i}`, median: median(vals) });
  }

  // Matrix + movers.
  const matrix: MatrixPoint[] = [];
  const moverRows: { id: string; handle: string; delta: number; acwr: number | null }[] = [];
  for (const p of data) {
    const now = acwrAgo(p, 0);
    const past = acwrAgo(p, 4);
    const delta = now != null && past != null ? now - past : 0;
    moverRows.push({ id: p.person.id, handle: p.person.handle, delta, acwr: now });
    if (now != null && p.signal.wellbeing != null) {
      matrix.push({
        id: p.person.id,
        handle: p.person.handle,
        acwr: now,
        feeling: p.signal.wellbeing,
        attention: p.signal.attention,
        loadDelta: delta,
      });
    }
  }

  const movers = moverRows
    .filter((m) => m.delta > 0.02)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 4);

  const falling = data.filter(
    (p) => p.signal.wellbeingSlope != null && p.signal.wellbeingSlope <= -0.05,
  ).length;

  // Danger corner = high load (ACWR ≥ 1.3) AND low feeling (≤ 3), now vs 4w ago.
  const inDanger = (acwr: number | null, feeling: number | null) =>
    acwr != null && feeling != null && acwr >= 1.3 && feeling <= 3;
  const dangerNow = data.filter((p) => inDanger(acwrAgo(p, 0), p.signal.wellbeing)).length;
  const dangerPrev = data.filter((p) => inDanger(acwrAgo(p, 4), p.signal.wellbeing)).length;

  return {
    loadTrend,
    matrix,
    movers,
    fallingShare: data.length ? falling / data.length : 0,
    dangerNow,
    dangerPrev,
  };
}

// ── Cohort breakdown (by team) ────────────────────────────────────────────────

export interface Cohort {
  team: string;
  size: number;
  medianAcwr: number | null;
  medianFeeling: number | null;
  /** People in the burnout corner (high load + low feeling). */
  danger: number;
  /** Share serving above their baseline (ACWR ≥ 1.1). */
  elevatedShare: number;
}

export function buildCohorts(data: SeededPerson[]): Cohort[] {
  const groups = new Map<string, SeededPerson[]>();
  for (const p of data) {
    const g = groups.get(p.person.team) ?? [];
    g.push(p);
    groups.set(p.person.team, g);
  }

  return [...groups.entries()]
    .map(([team, people]) => {
      const acwrs = people.map((p) => p.signal.acwr).filter((x): x is number => x != null);
      const feels = people.map((p) => p.signal.wellbeing).filter((x): x is number => x != null);
      const danger = people.filter(
        (p) => p.signal.acwr != null && p.signal.wellbeing != null && p.signal.acwr >= 1.3 && p.signal.wellbeing <= 3,
      ).length;
      const elevated = people.filter((p) => (p.signal.acwr ?? 0) >= 1.1).length;
      return {
        team,
        size: people.length,
        medianAcwr: median(acwrs),
        medianFeeling: median(feels),
        danger,
        elevatedShare: people.length ? elevated / people.length : 0,
      };
    })
    .sort((a, b) => (b.medianAcwr ?? 0) - (a.medianAcwr ?? 0));
}

// ── Forecast ──────────────────────────────────────────────────────────────────

export interface Forecast {
  horizonWeeks: number;
  /** People projected to cross the 1.5× spike line if the trend holds. */
  projectedSpiking: { id: string; handle: string; current: number; projected: number }[];
  /** Team median ACWR projected forward. */
  projectedTeamMedian: number | null;
}

/** Linear slope of the last `n` non-null ACWR points up to the effective now. */
function loadSlope(p: SeededPerson, n = 4): { slope: number; last: number } | null {
  const vals = p.rhythm.series
    .slice(0, p.rhythm.currentIndex + 1)
    .map((s) => s.acwr)
    .filter((x): x is number => x != null)
    .slice(-n);
  if (vals.length < 2) return null;
  const xMean = (vals.length - 1) / 2;
  const yMean = vals.reduce((a, b) => a + b, 0) / vals.length;
  let num = 0;
  let den = 0;
  vals.forEach((y, i) => {
    num += (i - xMean) * (y - yMean);
    den += (i - xMean) ** 2;
  });
  return { slope: den === 0 ? 0 : num / den, last: vals[vals.length - 1] };
}

export function buildForecast(data: SeededPerson[], horizonWeeks = 2): Forecast {
  const projectedSpiking: Forecast["projectedSpiking"] = [];
  const projectedNow: number[] = [];

  for (const p of data) {
    const s = loadSlope(p);
    if (!s) continue;
    const projected = s.last + s.slope * horizonWeeks;
    projectedNow.push(projected);
    if (projected >= 1.5 && s.last < 1.5) {
      projectedSpiking.push({
        id: p.person.id,
        handle: p.person.handle,
        current: round2(s.last),
        projected: round2(projected),
      });
    }
  }

  return {
    horizonWeeks,
    projectedSpiking: projectedSpiking.sort((a, b) => b.projected - a.projected),
    projectedTeamMedian: median(projectedNow),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Risk assessment ───────────────────────────────────────────────────────────
//
// Turns the signals into a plain-language risk read PER PERSON. Works on load
// alone (what we have live from Planning Center) and gets sharper once pulse
// feeling arrives. This is the "what about my team's risk" answer: not a vibe, a
// ranked list of people with the specific factors driving each one.

export type RiskLevel = "calm" | "watch" | "elevated" | "high";

export interface RiskFactor {
  key: string;
  label: string;
  severity: 1 | 2 | 3; // watch / elevated / high
}

export interface RiskAssessment {
  id: string;
  handle: string;
  name: string;
  team: string;
  level: RiskLevel;
  score: number;
  factors: RiskFactor[];
  acwr: number | null;
  loadDelta: number;
  weeksWithoutBreak: number;
  series: SeededPerson["rhythm"]["series"];
}

const LEVEL_BY_SEVERITY: Record<number, RiskLevel> = { 0: "calm", 1: "watch", 2: "elevated", 3: "high" };

export function assessRisk(p: SeededPerson): RiskAssessment {
  const factors: RiskFactor[] = [];
  const acwr = p.rhythm.currentAcwr;
  const weeks = p.rhythm.weeksWithoutBreak;
  const s = p.rhythm.series;
  const now = s[p.rhythm.currentIndex]?.acwr ?? null;
  const past = s[p.rhythm.currentIndex - 4]?.acwr ?? null;
  // Only call it a "rise" when there was a real baseline to rise from — otherwise
  // a returning volunteer coming off ~0 looks like a huge (meaningless) jump.
  const loadDelta = now != null && past != null && past >= 0.5 ? now - past : 0;

  // Load level
  if (acwr != null && acwr >= 1.5) factors.push({ key: "spike", label: `Load spiking · ${acwr.toFixed(2)}×`, severity: 3 });
  else if (acwr != null && acwr >= 1.3) factors.push({ key: "climb", label: `Load climbing · ${acwr.toFixed(2)}×`, severity: 2 });

  // Time since a break
  if (weeks >= 12) factors.push({ key: "nobreak", label: `${weeks} weeks no break`, severity: 3 });
  else if (weeks >= 8) factors.push({ key: "nobreak", label: `${weeks} weeks no break`, severity: 2 });
  else if (weeks >= 6) factors.push({ key: "nobreak", label: `${weeks} weeks no break`, severity: 1 });

  // Trajectory
  if (loadDelta >= 0.35) factors.push({ key: "rising", label: `Rising fast · ▲${loadDelta.toFixed(2)}`, severity: 2 });
  else if (loadDelta >= 0.2) factors.push({ key: "rising", label: `Rising · ▲${loadDelta.toFixed(2)}`, severity: 1 });

  // Feeling (only if pulse data exists)
  if (p.signal.wellbeing != null && p.signal.wellbeing <= 2.6)
    factors.push({ key: "feeling", label: "Running low after serving", severity: 3 });
  else if (p.signal.wellbeingSlope != null && p.signal.wellbeingSlope <= -0.15)
    factors.push({ key: "feeling-trend", label: "Energy trending down", severity: 2 });

  const maxSev = factors.reduce((m, f) => Math.max(m, f.severity), 0);
  const score = factors.reduce((s, f) => s + f.severity, 0);

  return {
    id: p.person.id,
    handle: p.person.handle,
    name: p.person.name,
    team: p.person.team,
    level: LEVEL_BY_SEVERITY[maxSev],
    score,
    factors,
    acwr,
    loadDelta,
    weeksWithoutBreak: weeks,
    series: p.rhythm.series,
  };
}

export function assessTeam(data: SeededPerson[]) {
  const all = data.map(assessRisk).sort((a, b) => b.score - a.score || (b.acwr ?? 0) - (a.acwr ?? 0));
  const atRisk = all.filter((r) => r.level !== "calm");
  const counts = {
    high: all.filter((r) => r.level === "high").length,
    elevated: all.filter((r) => r.level === "elevated").length,
    watch: all.filter((r) => r.level === "watch").length,
    calm: all.filter((r) => r.level === "calm").length,
  };
  const factorTally = {
    spike: all.filter((r) => r.factors.some((f) => f.key === "spike" || f.key === "climb")).length,
    nobreak: all.filter((r) => r.factors.some((f) => f.key === "nobreak")).length,
    rising: all.filter((r) => r.factors.some((f) => f.key === "rising")).length,
  };
  return { all, atRisk, counts, factorTally };
}

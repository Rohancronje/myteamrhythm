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

/** ACWR `weeksAgo` back in a person's series (0 = current). */
function acwrAgo(p: SeededPerson, weeksAgo: number): number | null {
  const s = p.rhythm.series;
  return s[s.length - 1 - weeksAgo]?.acwr ?? null;
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

/** Linear slope of the last `n` non-null ACWR points in a series. */
function loadSlope(p: SeededPerson, n = 4): { slope: number; last: number } | null {
  const vals = p.rhythm.series.map((s) => s.acwr).filter((x): x is number => x != null).slice(-n);
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

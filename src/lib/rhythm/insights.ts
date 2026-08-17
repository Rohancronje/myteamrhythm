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
  // Team load trend: median ACWR across people, per week.
  const maxLen = Math.max(...data.map((p) => p.rhythm.series.length));
  const loadTrend: { weekStart: string; median: number | null }[] = [];
  for (let i = maxLen - trendWeeks; i < maxLen; i++) {
    if (i < 0) continue;
    const week = data.find((p) => p.rhythm.series[i])?.rhythm.series[i]?.weekStart;
    const vals = data
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

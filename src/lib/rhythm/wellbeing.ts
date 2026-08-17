// Cross-referencing load and feeling.
//
// Load alone gives false positives: someone can serve a lot and be thriving.
// Feeling alone gives no early warning: people don't say they're struggling
// until they've already decided to quit. Together they're a leading indicator.
//
// This module also owns the PRIVACY GATE — the rule that decides whether an
// individual's detail may be unlocked for a pastoral conversation. By default
// everything is aggregate and pseudonymous; identity is only ever surfaced when
// a genuine risk threshold is crossed AND the viewer is a pastoral care lead.

import type { PersonRhythm, PulseResponse } from "./types";

export interface PulseTrend {
  /** Mean of the three dimensions across the recent window, 1–5. */
  wellbeing: number;
  /** Slope of wellbeing over the window: negative = trending down. */
  slope: number;
  /** How many pulses informed this. */
  sampleSize: number;
}

/** Reduces a run of pulses (oldest→newest) to a single trend. */
export function computePulseTrend(pulses: PulseResponse[], window = 6): PulseTrend {
  const recent = pulses.slice(-window);
  if (recent.length === 0) return { wellbeing: NaN, slope: 0, sampleSize: 0 };

  const scores = recent.map((p) => (p.energy + p.meaning) / 2);
  const wellbeing = mean(scores);
  const slope = scores.length >= 2 ? linregSlope(scores) : 0;

  return { wellbeing: round(wellbeing), slope: round(slope), sampleSize: recent.length };
}

export type AttentionLevel = "thriving" | "watch" | "check_in" | "priority";

export interface RhythmSignal {
  personId: string;
  attention: AttentionLevel;
  /** Plain-language reasons, meant to seed a human conversation. */
  reasons: string[];
  acwr: number | null;
  wellbeing: number | null;
  wellbeingSlope: number | null;
}

/**
 * The core cross-reference. Note the asymmetry we designed for:
 *  - High load + FALLING feeling  → the real early warning (priority)
 *  - High load + steady feeling   → watch, don't alarm (thriving-under-load)
 *  - Normal load + falling feeling → check in; something off-platform may be up
 */
export function computeSignal(
  rhythm: PersonRhythm,
  trend: PulseTrend | null,
): RhythmSignal {
  const reasons: string[] = [];
  const acwr = rhythm.currentAcwr;
  const hasPulse = trend !== null && trend.sampleSize > 0;
  const wellbeing = hasPulse ? trend!.wellbeing : null;
  const slope = hasPulse ? trend!.slope : null;

  const loadSpiking = acwr !== null && acwr >= 1.5;
  const loadClimbing = acwr !== null && acwr >= 1.3;
  const feelingLow = wellbeing !== null && wellbeing <= 2.6;
  const feelingFalling = slope !== null && slope <= -0.15;
  const longStint = rhythm.weeksWithoutBreak >= 8;

  if (loadSpiking) reasons.push(`Serving load is ${acwr!.toFixed(2)}× their normal pace`);
  else if (loadClimbing) reasons.push(`Serving load is climbing (${acwr!.toFixed(2)}× baseline)`);
  if (longStint) reasons.push(`${rhythm.weeksWithoutBreak} weeks serving without a break`);
  if (feelingFalling) reasons.push("Post-service energy is trending down");
  if (feelingLow) reasons.push("Recent check-ins skew drained / obligation");

  let attention: AttentionLevel = "thriving";

  if ((loadClimbing || longStint) && (feelingFalling || feelingLow)) {
    // Objective spike confirmed by subjective decline — the leading indicator.
    attention = "priority";
  } else if (loadSpiking || (feelingLow && feelingFalling)) {
    attention = "check_in";
  } else if (loadClimbing || longStint || feelingFalling || feelingLow) {
    attention = "watch";
  }

  if (reasons.length === 0) reasons.push("Serving in a sustainable rhythm");

  return { personId: rhythm.personId, attention, reasons, acwr, wellbeing, wellbeingSlope: slope };
}

// ── Privacy gate ──────────────────────────────────────────────────────────────

export type ViewerRole = "team_member" | "team_lead" | "pastoral_care";

/**
 * Whether an individual's identity + detail may be unlocked for `viewer`.
 * Non-negotiable rules encoded here so the UI can't accidentally leak:
 *   1. Only pastoral_care leads can unlock anyone but themselves.
 *   2. Even then, only once attention has reached check_in or priority.
 *   3. Anyone may always see their OWN detail.
 */
export function canUnlockIndividual(
  viewer: { role: ViewerRole; personId: string },
  signal: RhythmSignal,
): boolean {
  if (viewer.personId === signal.personId) return true;
  if (viewer.role !== "pastoral_care") return false;
  return signal.attention === "check_in" || signal.attention === "priority";
}

/** Aggregate-only rollup for team dashboards — never exposes identities. */
export function aggregateSignals(signals: RhythmSignal[]) {
  const counts: Record<AttentionLevel, number> = {
    thriving: 0,
    watch: 0,
    check_in: 0,
    priority: 0,
  };
  for (const s of signals) counts[s.attention]++;

  const acwrs = signals.map((s) => s.acwr).filter((x): x is number => x !== null);
  const wells = signals.map((s) => s.wellbeing).filter((x): x is number => x !== null);

  return {
    total: signals.length,
    counts,
    medianAcwr: median(acwrs),
    medianWellbeing: median(wells),
    // Small-n guard: never show a team cell built from fewer than 4 people.
    reportable: signals.length >= 4,
  };
}

// ── tiny stats helpers ────────────────────────────────────────────────────────

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return round(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
}

/** Least-squares slope of ys against evenly-spaced x = 0..n-1. */
function linregSlope(ys: number[]): number {
  const n = ys.length;
  const xMean = (n - 1) / 2;
  const yMean = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (ys[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

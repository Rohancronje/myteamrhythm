// The Rhythm engine.
//
// Borrows the Acute:Chronic Workload Ratio (ACWR) from sports science — the
// model athletic teams use to predict injury risk by comparing recent training
// load to a rolling baseline. We apply the same math to *serving* load.
//
// KEY ADAPTATION: the classic ACWR uses a 7-day acute / 28-day chronic window
// because athletes train ~daily. Church serving is a WEEKLY cadence with at most
// a few slots per week, so a 7-day window is far too noisy (one extra Sunday can
// double it). We therefore bucket load by ISO week and use exponentially-weighted
// moving averages over WEEKS: a 3-week acute window against a 12-week chronic
// baseline (Williams et al. EWMA formulation, lambda = 2 / (N + 1)).
//
// A ratio consistently above ~1.3–1.5 flags a spike — someone serving well above
// their own normal pace — *before* it becomes a resignation conversation.

import type {
  PersonRhythm,
  RhythmZone,
  ServiceType,
  ServiceTypeKey,
  ServingEvent,
  WeeklyLoadPoint,
} from "./types";

export interface RhythmConfig {
  /** Acute window length in weeks (recent load). */
  acuteWeeks: number;
  /** Chronic window length in weeks (baseline load). */
  chronicWeeks: number;
  /** Per-service-type intensity weights. */
  serviceWeights: Record<ServiceTypeKey, number>;
  /**
   * Declined/unconfirmed assignments still cost something (the mental load of
   * being asked, the guilt of saying no) but far less than showing up.
   */
  statusWeights: { confirmed: number; unconfirmed: number; declined: number };
  /** ACWR boundaries between rhythm zones. */
  thresholds: { steadyMin: number; climbingMin: number; spikingMin: number };
}

export const DEFAULT_CONFIG: RhythmConfig = {
  acuteWeeks: 3,
  chronicWeeks: 12,
  serviceWeights: { sunday_am: 1.0, sunday_pm: 0.8, wednesday_night: 0.7 },
  statusWeights: { confirmed: 1.0, unconfirmed: 0.5, declined: 0.1 },
  thresholds: { steadyMin: 0.8, climbingMin: 1.3, spikingMin: 1.5 },
};

export const DEFAULT_SERVICE_TYPES: ServiceType[] = [
  { key: "sunday_am", name: "Sunday AM", weight: 1.0 },
  { key: "sunday_pm", name: "Sunday PM", weight: 0.8 },
  { key: "wednesday_night", name: "Wednesday Night", weight: 0.7 },
];

// ── Date helpers (ISO week, Monday-anchored) ──────────────────────────────────

/** Returns the Monday (UTC) that starts the ISO week containing `date`. */
export function isoWeekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // getUTCDay: 0=Sun … 6=Sat. Shift so Monday = 0.
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d;
}

// ── Load computation ──────────────────────────────────────────────────────────

/** Weighted load contributed by a single serving event. */
export function eventLoad(event: ServingEvent, config: RhythmConfig): number {
  const service = config.serviceWeights[event.serviceType] ?? 1;
  const status = config.statusWeights[event.status] ?? 1;
  const role = event.roleWeight ?? 1;
  return service * status * role;
}

/**
 * Buckets a person's serving events into a dense, gap-filled weekly series.
 * Empty weeks are included with rawLoad 0 — crucial, because a genuine break
 * should visibly decay the acute load and pull the ratio down.
 */
export function buildWeeklyLoad(
  events: ServingEvent[],
  config: RhythmConfig,
  opts?: { from?: Date; to?: Date },
): { weekStart: string; rawLoad: number }[] {
  if (events.length === 0) return [];

  const byWeek = new Map<string, number>();
  let min = Infinity;
  let max = -Infinity;

  for (const ev of events) {
    const wk = isoWeekStart(new Date(ev.date + "T00:00:00Z"));
    const key = toISODate(wk);
    byWeek.set(key, (byWeek.get(key) ?? 0) + eventLoad(ev, config));
    min = Math.min(min, wk.getTime());
    max = Math.max(max, wk.getTime());
  }

  const start = opts?.from ? isoWeekStart(opts.from) : new Date(min);
  const end = opts?.to ? isoWeekStart(opts.to) : new Date(max);

  const series: { weekStart: string; rawLoad: number }[] = [];
  for (let w = new Date(start); w.getTime() <= end.getTime(); w = addWeeks(w, 1)) {
    const key = toISODate(w);
    series.push({ weekStart: key, rawLoad: byWeek.get(key) ?? 0 });
  }
  return series;
}

/** EWMA smoothing factor for an N-period window: lambda = 2 / (N + 1). */
function lambda(n: number): number {
  return 2 / (n + 1);
}

/**
 * Computes acute/chronic EWMAs and the ACWR for each week in the series.
 * ACWR is null until the chronic baseline has had a chance to warm up
 * (we require at least `acuteWeeks` of history) to avoid noisy early ratios.
 */
export function computeAcwrSeries(
  rawSeries: { weekStart: string; rawLoad: number }[],
  config: RhythmConfig,
): WeeklyLoadPoint[] {
  const la = lambda(config.acuteWeeks);
  const lc = lambda(config.chronicWeeks);

  let acute = 0;
  let chronic = 0;
  const out: WeeklyLoadPoint[] = [];

  rawSeries.forEach((point, i) => {
    if (i === 0) {
      acute = point.rawLoad;
      chronic = point.rawLoad;
    } else {
      acute = point.rawLoad * la + acute * (1 - la);
      chronic = point.rawLoad * lc + chronic * (1 - lc);
    }
    const warm = i >= config.acuteWeeks && chronic > 0.0001;
    out.push({
      weekStart: point.weekStart,
      rawLoad: point.rawLoad,
      acute: round(acute),
      chronic: round(chronic),
      acwr: warm ? round(acute / chronic) : null,
    });
  });

  return out;
}

export function zoneForAcwr(acwr: number | null, config: RhythmConfig): RhythmZone {
  if (acwr === null) return "resting";
  const { steadyMin, climbingMin, spikingMin } = config.thresholds;
  if (acwr >= spikingMin) return "spiking";
  if (acwr >= climbingMin) return "climbing";
  if (acwr >= steadyMin) return "steady";
  return "resting";
}

/** Index of the most recent week with any load; falls back to the last week. */
function lastServedIndex(series: WeeklyLoadPoint[]): number {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].rawLoad > 0) return i;
  }
  return series.length - 1;
}

/** Consecutive served weeks ending at `end` (the current serving streak). */
function servingStreak(series: WeeklyLoadPoint[], end: number): number {
  let streak = 0;
  for (let i = end; i >= 0; i--) {
    if (series[i].rawLoad > 0) streak++;
    else break;
  }
  return streak;
}

/** Weeks between `end` and the previous 0-load week (the last genuine break). */
function weeksSinceBreak(series: WeeklyLoadPoint[], end: number): number | null {
  for (let i = end; i >= 0; i--) {
    if (series[i].rawLoad === 0) return end - i;
  }
  return null; // never rested in the observed window
}

/** Rolls a person's raw events all the way up to their current rhythm state. */
export function computePersonRhythm(
  personId: string,
  events: ServingEvent[],
  config: RhythmConfig = DEFAULT_CONFIG,
  opts?: { from?: Date; to?: Date },
): PersonRhythm {
  const raw = buildWeeklyLoad(events, config, opts);
  const series = computeAcwrSeries(raw, config);
  // "Now" = the most recent week they actually served, not the calendar end.
  const idx = lastServedIndex(series);
  const currentAcwr = series[idx]?.acwr ?? null;

  return {
    personId,
    series,
    currentIndex: idx,
    currentAcwr,
    zone: zoneForAcwr(currentAcwr, config),
    weeksWithoutBreak: servingStreak(series, idx),
    weeksSinceLastBreak: weeksSinceBreak(series, idx),
  };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

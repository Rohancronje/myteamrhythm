// Core domain types for Rhythm.
// Kept framework-free so the engine can be unit-tested in isolation.

/** The three service rhythms in the City Impact / NS Family Services pilot. */
export type ServiceTypeKey = "sunday_am" | "sunday_pm" | "wednesday_night";

export interface ServiceType {
  key: ServiceTypeKey;
  name: string;
  /**
   * Relative intensity of serving this slot, used to weight raw load.
   * A full Sunday morning is the reference (1.0); an evening or midweek
   * service asks less of a volunteer and is weighted down accordingly.
   */
  weight: number;
}

/** How a person was scheduled on a given plan. */
export type ScheduleStatus = "confirmed" | "unconfirmed" | "declined";

/** One serving assignment on one dated service — the atomic unit of load. */
export interface ServingEvent {
  personId: string;
  serviceType: ServiceTypeKey;
  /** ISO date (YYYY-MM-DD) of the service. */
  date: string;
  status: ScheduleStatus;
  /**
   * Optional per-role multiplier (e.g. leading vs. greeting). Defaults to 1.
   * Lets us say "worship lead" costs more than "welcome desk" later.
   */
  roleWeight?: number;
}

/** Subjective post-service pulse. Stored pseudonymously by default. */
export interface PulseResponse {
  /** Pseudonymous participant id — NOT the Planning Center person id. */
  participantId: string;
  /** ISO date of the service this pulse follows. */
  date: string;
  /** "After serving today I feel…" drained (1) → energised (5). */
  energy: number;
  /** "Serving today felt like…" obligation (1) → worship (5). */
  meaning: number;
  /** Free-text, optional. Never surfaced on aggregate dashboards. */
  note?: string;
}

/** A single week's computed picture for one person. */
export interface WeeklyLoadPoint {
  /** ISO week start (Monday) as YYYY-MM-DD. */
  weekStart: string;
  /** Weighted serving load accrued this week. */
  rawLoad: number;
  /** Exponentially-weighted acute (recent) load. */
  acute: number;
  /** Exponentially-weighted chronic (baseline) load. */
  chronic: number;
  /** acute / chronic. null until a chronic baseline exists. */
  acwr: number | null;
}

export type RhythmZone = "resting" | "steady" | "climbing" | "spiking";

/** The full rolled-up rhythm state for a person. */
export interface PersonRhythm {
  personId: string;
  series: WeeklyLoadPoint[];
  /** Index into `series` of the most recent SERVED week — the "effective now".
   *  The calendar-latest week is often empty (this week's services haven't
   *  happened yet), so all current metrics are read from here, not series end. */
  currentIndex: number;
  /** Latest ACWR, or null if not enough history. */
  currentAcwr: number | null;
  zone: RhythmZone;
  /** Consecutive weeks served without a break (a 0-load week resets it). */
  weeksWithoutBreak: number;
  /** Weeks since the most recent 0-load week, i.e. the last real break. */
  weeksSinceLastBreak: number | null;
}

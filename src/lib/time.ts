// NZ-local time helpers. The server runs in UTC (Vercel), but NS Family Services
// is in New Zealand (UTC+12/13). Using raw `new Date()` for "today"/"now" is off
// by up to a full day. Everything date/time-of-day sensitive routes through here.

const NZ = "Pacific/Auckland";

/** Today's date in NZ as YYYY-MM-DD. */
export function nzToday(): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: NZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Current hour (0–23) in NZ. */
export function nzHour(): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: NZ, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
}

/** A Date anchored to NZ's current calendar day (noon UTC) — safe for ISO-week
 *  math that uses UTC getters, so it lands in the right NZ week. */
export function nzNowAnchor(): Date {
  return new Date(nzToday() + "T12:00:00Z");
}

/** Whole days from NZ-today to a YYYY-MM-DD date (negative = past). */
export function daysFromToday(dateISO: string): number {
  const t0 = Date.parse(nzToday() + "T00:00:00Z");
  const t1 = Date.parse(dateISO + "T00:00:00Z");
  return Math.round((t1 - t0) / 86400000);
}

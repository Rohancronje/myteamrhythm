// Load & streak assessment — implements the rules from the developer handover
// (section 4), each captured from a real bug against 2026 roster data.
//
//  1. Dedupe by planId before counting — one service = one task, even if a person
//     holds multiple roles on it.
//  2. Combined roles within one service are one task (falls out of #1).
//  3. Two services a week is the healthy baseline; THREE OR MORE in a week is the
//     flag point. Repeated 3+ weeks weigh more than a one-off.
//  4. Streaks are tracked independently of weekly count (someone can stay at 2/wk
//     for months and never get a break).
//  5. Only count past, actually-occurred services; anchor to the REAL current
//     date, never the latest date in the dataset.
//
// Output is plain-language only — Steady / Watch / Elevated + one sentence. No
// ratios, no charts, no axes anywhere in the product surface.

export type Status = "steady" | "watch" | "elevated";

export interface PersonEvent {
  serviceType: string;
  date: string; // YYYY-MM-DD, past services only
  planId: string;
  status: string; // confirmed | unconfirmed | declined
  position: string;
}

export interface Assessment {
  status: Status;
  /** One plain-language sentence explaining a flag (empty string if Steady). */
  reason: string;
  /** Consecutive weeks served without a break (rule 4). */
  streakWeeks: number;
  /** Distinct services this current week. */
  servicesThisWeek: number;
  /** Weeks in the last 6 with 3+ services (rule 3). */
  heavyWeeksRecent: number;
  /** Distinct services across the window. */
  totalServices: number;
  /** Per-week served/not (oldest→newest) for the dot-calendar graph. */
  weeklyDots: boolean[];
  lastServed: string | null;
  recentlyActive: boolean;
}

function isoWeekStartUTC(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (x.getUTCDay() + 6) % 7; // Mon=0
  x.setUTCDate(x.getUTCDate() - day);
  return x;
}
function weekKey(d: Date): string {
  return isoWeekStartUTC(d).toISOString().slice(0, 10);
}

/**
 * @param now  real current date (rule 5) — pass the actual today.
 * @param windowWeeks how many weeks of history to lay out for the dot-calendar.
 */
export function assess(events: PersonEvent[], now: Date, windowWeeks = 26): Assessment {
  // Only real, non-declined services, deduped by planId (rules 1 & 2).
  const served = events.filter((e) => e.status !== "declined");
  const byWeek = new Map<string, Set<string>>(); // weekKey -> distinct planIds
  let lastServed: string | null = null;
  for (const e of served) {
    const wk = weekKey(new Date(e.date + "T00:00:00Z"));
    const set = byWeek.get(wk) ?? new Set<string>();
    set.add(e.planId);
    byWeek.set(wk, set);
    if (!lastServed || e.date > lastServed) lastServed = e.date;
  }

  // Build the dense week timeline ending at the current (real) week.
  const end = isoWeekStartUTC(now);
  const weeks: { key: string; count: number }[] = [];
  for (let i = windowWeeks - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i * 7);
    const key = weekKey(d);
    weeks.push({ key, count: byWeek.get(key)?.size ?? 0 });
  }

  const weeklyDots = weeks.map((w) => w.count > 0);
  const totalServices = [...byWeek.values()].reduce((s, set) => s + set.size, 0);
  const servicesThisWeek = weeks.at(-1)?.count ?? 0;

  // Streak: consecutive served weeks ending at the last served week (rule 4).
  let lastServedIdx = -1;
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i].count > 0) {
      lastServedIdx = i;
      break;
    }
  }
  let streakWeeks = 0;
  for (let i = lastServedIdx; i >= 0; i--) {
    if (weeks[i].count > 0) streakWeeks++;
    else break;
  }

  const heavyWeeksRecent = weeks.slice(-6).filter((w) => w.count >= 3).length;
  const recentlyActive = weeks.slice(-2).some((w) => w.count > 0);

  const { status, reason } = classify({ streakWeeks, servicesThisWeek, heavyWeeksRecent, recentlyActive });

  return {
    status,
    reason,
    streakWeeks,
    servicesThisWeek,
    heavyWeeksRecent,
    totalServices,
    weeklyDots,
    lastServed,
    recentlyActive,
  };
}

function classify(x: {
  streakWeeks: number;
  servicesThisWeek: number;
  heavyWeeksRecent: number;
  recentlyActive: boolean;
}): { status: Status; reason: string } {
  const reasons: { sev: number; text: string }[] = [];

  // Rule 3 — repeated 3+ weeks weigh more than a one-off.
  if (x.heavyWeeksRecent >= 2)
    reasons.push({ sev: 3, text: `Three or more services a week, ${x.heavyWeeksRecent} of the last 6 weeks` });
  else if (x.servicesThisWeek >= 3)
    reasons.push({ sev: 2, text: `${x.servicesThisWeek} services this week — above the healthy pace` });
  else if (x.heavyWeeksRecent === 1)
    reasons.push({ sev: 1, text: "A heavier-than-usual week recently" });

  // Rule 4 — long streak without a break, independent of weekly count.
  if (x.streakWeeks >= 16) reasons.push({ sev: 3, text: `${x.streakWeeks} weeks serving without a break` });
  else if (x.streakWeeks >= 8) reasons.push({ sev: 2, text: `${x.streakWeeks} weeks serving without a break` });
  else if (x.streakWeeks >= 6) reasons.push({ sev: 1, text: `${x.streakWeeks} weeks serving without a break` });

  const maxSev = reasons.reduce((m, r) => Math.max(m, r.sev), 0);
  // Elevated is the top severity; Watch spans the milder flags; Steady has none.
  const status: Status = maxSev >= 3 ? "elevated" : maxSev >= 1 ? "watch" : "steady";
  const top = reasons.sort((a, b) => b.sev - a.sev)[0];
  return { status, reason: top?.text ?? "" };
}

// Links a Connect team member to their Planning Center serving record — by name,
// since PCO `people` carry no email. Exposes their most recent confirmed serve and
// their next rostered service, so a coach sees serving context on a person's card.
//
// Matching is name-based and conservative: a member is linked only when their name
// resolves to exactly ONE PCO person (ambiguous same-name matches are left unlinked
// rather than risk showing the wrong person's serving history). For the pilot roster
// this matches 42/42 members cleanly.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { unstable_cache } from "next/cache";
import { getUpcoming, serviceLabel } from "./upcoming";

export interface ServeRef {
  date: string; // ISO yyyy-mm-dd
  serviceType: string; // e.g. sunday_am
  serviceLabel: string; // e.g. "Sunday AM"
  position: string; // roster position / sub-team
}

export interface ServeLoad {
  serves: number; // services this person served in the trailing window
  total: number; // total services held in the window (the denominator)
  pct: number; // 0..1, serves / total
  band: "light" | "busy" | "high"; // high = burnout-watch (see thresholds below)
  weeks: number; // window length (6)
}

const LOAD_WEEKS = 6;
// Thresholds are grounded in the roster's real distribution over a 6-week window
// (~17 services; median 3, p90 7): >=40% of services is the top ~10% of servers.
const HIGH_PCT = 0.4;
const BUSY_PCT = 0.2;

function minusDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

interface PcoPerson {
  pcoId: string;
  name: string;
  events: { serviceType: string; date: string; status: string; position: string }[];
}

/** Normalise a name for matching, returning the variants to index/look up under.
 *  Drops "(nicknames)" and "quoted" segments, strips non-letters, lowercases. A
 *  second variant keeps the parenthetical (so "Liz (Elizabeth) Eckhoff" indexes
 *  under both "liz eckhoff" and "elizabeth eckhoff"). */
function normVariants(name: string): string[] {
  const clean = (s: string) =>
    s.replace(/["'“”‘’][^"'“”‘’]*["'“”‘’]/g, " ").replace(/[^\p{L}\s]/gu, " ").toLowerCase().split(/\s+/).filter(Boolean).join(" ");
  const base = clean(name.replace(/\(([^)]*)\)/g, " ")); // drop paren content
  const expanded = clean(name.replace(/([\p{L}]+)\s*\(([^)]*)\)/gu, "$2")); // use paren content
  return [...new Set([base, expanded].filter(Boolean))];
}

async function loadPeople(): Promise<PcoPerson[]> {
  if (process.env.DATABASE_URL) {
    try {
      const { readRosterSnapshot } = await import("@/db/read");
      const snap = await readRosterSnapshot();
      return snap.people.map((p) => ({ pcoId: p.pcoId, name: p.name, events: p.events }));
    } catch {
      return [];
    }
  }
  try {
    const snap = JSON.parse(readFileSync(join(process.cwd(), ".data", "pco-snapshot.json"), "utf8")) as { people: PcoPerson[] };
    return snap.people ?? [];
  } catch {
    return [];
  }
}

// The PCO roster changes only on sync; cache it (shared "team" tag revalidates it).
const loadPeopleCached = unstable_cache(loadPeople, ["rhythm:serving-people"], { revalidate: 300, tags: ["team"] });

export interface ServingIndex {
  /** The PCO person id for a member name, or null when unmatched/ambiguous. */
  pcoIdFor(name: string): string | null;
  /** Most recent confirmed serve on or before `today` (ISO date). */
  lastServe(pcoId: string, today: string): ServeRef | null;
  /** Soonest upcoming service the person is rostered on. */
  nextServe(pcoId: string): ServeRef | null;
  /** How many services they served in the trailing 6 weeks, vs. the total held. */
  load6w(pcoId: string, today: string): ServeLoad | null;
}

/** Build the serving index once (name→person, last serve, next serve). Returns an
 *  empty index (everything null) when no PCO data is available, so callers degrade
 *  gracefully. */
export async function getServingIndex(): Promise<ServingIndex> {
  const [people, upcoming] = await Promise.all([loadPeopleCached(), getUpcoming()]);

  const byName = new Map<string, Set<string>>();
  const byId = new Map<string, PcoPerson>();
  for (const p of people) {
    byId.set(p.pcoId, p);
    for (const v of normVariants(p.name)) {
      const s = byName.get(v) ?? new Set<string>();
      s.add(p.pcoId);
      byName.set(v, s);
    }
  }

  // A "service" is one date + service-type (events carry no plan id). Memoise the
  // window's total service count per cutoff so we compute it once, not per person.
  const windowTotalMemo = new Map<string, number>();
  function totalServices(cutoff: string, today: string): number {
    const cached = windowTotalMemo.get(cutoff);
    if (cached !== undefined) return cached;
    const set = new Set<string>();
    for (const p of people) for (const e of p.events) {
      if (e.status === "confirmed" && e.date >= cutoff && e.date <= today) set.add(`${e.date}|${e.serviceType}`);
    }
    windowTotalMemo.set(cutoff, set.size);
    return set.size;
  }

  // Upcoming is soonest-first, so the first roster hit for a person is their next serve.
  const nextByPco = new Map<string, ServeRef>();
  for (const s of upcoming) {
    for (const r of s.roster) {
      if (!nextByPco.has(r.pcoId)) {
        nextByPco.set(r.pcoId, { date: s.date, serviceType: s.serviceType, serviceLabel: serviceLabel(s.serviceType), position: r.position });
      }
    }
  }

  return {
    pcoIdFor(name: string): string | null {
      const hits = new Set<string>();
      for (const v of normVariants(name)) for (const id of byName.get(v) ?? []) hits.add(id);
      return hits.size === 1 ? [...hits][0] : null;
    },
    lastServe(pcoId: string, today: string): ServeRef | null {
      const p = byId.get(pcoId);
      if (!p) return null;
      const past = p.events
        .filter((e) => e.status === "confirmed" && e.date <= today)
        .sort((a, b) => b.date.localeCompare(a.date));
      const e = past[0];
      return e ? { date: e.date, serviceType: e.serviceType, serviceLabel: serviceLabel(e.serviceType), position: e.position } : null;
    },
    nextServe(pcoId: string): ServeRef | null {
      return nextByPco.get(pcoId) ?? null;
    },
    load6w(pcoId: string, today: string): ServeLoad | null {
      const p = byId.get(pcoId);
      if (!p) return null;
      const cutoff = minusDays(today, LOAD_WEEKS * 7);
      const total = totalServices(cutoff, today);
      const set = new Set<string>();
      for (const e of p.events) {
        if (e.status === "confirmed" && e.date >= cutoff && e.date <= today) set.add(`${e.date}|${e.serviceType}`);
      }
      const serves = set.size;
      const pct = total ? serves / total : 0;
      const band: ServeLoad["band"] = pct >= HIGH_PCT ? "high" : pct >= BUSY_PCT ? "busy" : "light";
      return { serves, total, pct, band, weeks: LOAD_WEEKS };
    },
  };
}

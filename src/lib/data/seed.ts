// Deterministic seed data for the City Impact / NS Family Services pilot.
//
// This stands in for the Planning Center sync until real data is wired. It is
// DETERMINISTIC (seeded PRNG + fixed anchor date) so the dashboard renders the
// same every reload — important for a demo, and it means no Math.random/Date.now
// nondeterminism sneaks into snapshots. Each archetype is designed to exercise a
// different corner of the load × feeling matrix.

import { DEFAULT_CONFIG, computePersonRhythm } from "@/lib/rhythm/acwr";
import type { PulseResponse, ServiceTypeKey, ServingEvent } from "@/lib/rhythm/types";
import { computePulseTrend, computeSignal } from "@/lib/rhythm/wellbeing";

/** Anchor "today" so the seed never drifts. Matches the pilot's current week. */
export const ANCHOR = new Date("2026-08-17T00:00:00Z");
const WEEKS = 26;

export interface Person {
  id: string;
  /** Pseudonymous handle used everywhere aggregate. */
  handle: string;
  name: string;
  initials: string;
  team: string;
  role: string;
}

type Archetype = {
  person: Person;
  /** Probability of serving each service type, per week, across the window. */
  cadence: (weekIdx: number) => Partial<Record<ServiceTypeKey, number>>;
  /** Baseline wellbeing and its drift per week (negative = declining). */
  feeling: { base: number; drift: number; noise: number };
};

// ── seeded PRNG (mulberry32) ──────────────────────────────────────────────────
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weekDate(weekIdx: number): Date {
  const d = new Date(ANCHOR);
  d.setUTCDate(d.getUTCDate() - (WEEKS - 1 - weekIdx) * 7);
  return d;
}

const P = (id: string, name: string, team: string, role: string): Person => ({
  id,
  handle: `NS-${id.toUpperCase()}`,
  name,
  initials: name.split(" ").map((n) => n[0]).join("").slice(0, 2),
  team,
  role,
});

const ARCHETYPES: Archetype[] = [
  {
    // The spike: pulled onto everything for the winter series. Load 1.6×, feeling
    // falling → the leading indicator we exist to catch. PRIORITY.
    person: P("mara", "Mara Whitfield", "Kids Large Group", "Host"),
    cadence: (w) =>
      w < 23
        ? { sunday_am: 0.85, wednesday_night: 0.15 }
        : { sunday_am: 1, sunday_pm: 1, wednesday_night: 1 },
    feeling: { base: 4.0, drift: -0.09, noise: 0.4 },
  },
  {
    // Thriving under load: serves a lot, feels great. Load high but steady feeling
    // → WATCH, not alarm. This is the false-positive guard.
    person: P("dev", "Dev Ramaswamy", "Production", "Audio"),
    cadence: () => ({ sunday_am: 1, sunday_pm: 0.7, wednesday_night: 0.4 }),
    feeling: { base: 4.4, drift: 0.01, noise: 0.3 },
  },
  {
    // Quiet fade: normal load, but energy sliding. Something off-platform.
    person: P("joel", "Joel Afoa", "Welcome", "Team Lead"),
    cadence: () => ({ sunday_am: 0.9 }),
    feeling: { base: 3.6, drift: -0.11, noise: 0.35 },
  },
  {
    person: P("hana", "Hana Sione", "Kids Small Group", "Leader"),
    cadence: (w) => (w < 20 ? { sunday_am: 0.85 } : { sunday_am: 1, sunday_pm: 0.6 }),
    feeling: { base: 3.9, drift: -0.05, noise: 0.4 },
  },
  {
    // Steady faithful: the sustainable ideal. THRIVING.
    person: P("grace", "Grace Toma", "Welcome", "Greeter"),
    cadence: () => ({ sunday_am: 0.8 }),
    feeling: { base: 4.2, drift: 0.0, noise: 0.3 },
  },
  {
    person: P("sam", "Sam Okafor", "Production", "Lighting"),
    cadence: () => ({ sunday_am: 0.7, wednesday_night: 0.5 }),
    feeling: { base: 4.0, drift: 0.0, noise: 0.35 },
  },
  {
    // Resting: stepped back the last few weeks. Ratio drops below 0.8.
    person: P("noa", "Noa Fifita", "Kids Large Group", "Games"),
    cadence: (w) => (w < 20 ? { sunday_am: 0.9, wednesday_night: 0.4 } : {}),
    feeling: { base: 4.1, drift: 0.03, noise: 0.3 },
  },
  {
    person: P("ana", "Ana Petero", "Kids Small Group", "Leader"),
    cadence: () => ({ sunday_am: 0.75, sunday_pm: 0.2 }),
    feeling: { base: 4.0, drift: 0.0, noise: 0.4 },
  },
  {
    // Climbing + long stint, feeling starting to dip. CHECK-IN.
    person: P("tevita", "Tevita Halo", "Production", "Camera"),
    cadence: (w) => (w < 14 ? { sunday_am: 0.8 } : { sunday_am: 1, wednesday_night: 0.7 }),
    feeling: { base: 3.8, drift: -0.06, noise: 0.35 },
  },
  {
    person: P("ruth", "Ruth Naidu", "Welcome", "Carpark"),
    cadence: () => ({ sunday_am: 0.7 }),
    feeling: { base: 4.3, drift: 0.0, noise: 0.3 },
  },
  {
    person: P("caleb", "Caleb Wiremu", "Kids Large Group", "Worship"),
    cadence: () => ({ sunday_am: 0.9, sunday_pm: 0.3, wednesday_night: 0.3 }),
    feeling: { base: 4.1, drift: -0.02, noise: 0.35 },
  },
  {
    person: P("lea", "Lea Fonoti", "Kids Small Group", "Leader"),
    cadence: (w) => (w < 22 ? { sunday_am: 0.8 } : { sunday_am: 1, sunday_pm: 0.9 }),
    feeling: { base: 3.9, drift: -0.07, noise: 0.4 },
  },
  {
    person: P("ben", "Ben Turaga", "Production", "Slides"),
    cadence: () => ({ sunday_am: 0.7, wednesday_night: 0.3 }),
    feeling: { base: 4.2, drift: 0.01, noise: 0.3 },
  },
  {
    person: P("mele", "Mele Kaufusi", "Welcome", "Greeter"),
    cadence: () => ({ sunday_am: 0.75 }),
    feeling: { base: 4.0, drift: 0.0, noise: 0.35 },
  },
];

function buildEvents(a: Archetype, rand: () => number): ServingEvent[] {
  const events: ServingEvent[] = [];
  for (let w = 0; w < WEEKS; w++) {
    const wk = a.cadence(w);
    const base = weekDate(w);
    (Object.entries(wk) as [ServiceTypeKey, number][]).forEach(([svc, prob]) => {
      if (rand() < prob) {
        const d = new Date(base);
        // Wednesday services fall midweek; Sunday ones on the week's Sunday.
        d.setUTCDate(d.getUTCDate() + (svc === "wednesday_night" ? 2 : 6));
        const roll = rand();
        const status = roll > 0.9 ? "declined" : roll > 0.8 ? "unconfirmed" : "confirmed";
        events.push({
          personId: a.person.id,
          serviceType: svc,
          date: d.toISOString().slice(0, 10),
          status,
        });
      }
    });
  }
  return events;
}

function buildPulses(a: Archetype, events: ServingEvent[], rand: () => number): PulseResponse[] {
  // A pulse follows roughly 70% of confirmed services.
  const served = events.filter((e) => e.status === "confirmed");
  const pulses: PulseResponse[] = [];
  served.forEach((e, i) => {
    if (rand() > 0.7) return;
    const t = i / Math.max(1, served.length - 1); // 0..1 across the window
    const wob = a.feeling.base + a.feeling.drift * (served.length * t) + (rand() - 0.5) * a.feeling.noise;
    const clamp = (x: number) => Math.max(1, Math.min(5, Math.round(x)));
    pulses.push({
      participantId: a.person.handle,
      date: e.date,
      energy: clamp(wob),
      meaning: clamp(wob + (rand() - 0.5) * 0.6),
    });
  });
  return pulses;
}

export interface SeededPerson {
  person: Person;
  events: ServingEvent[];
  pulses: PulseResponse[];
  rhythm: ReturnType<typeof computePersonRhythm>;
  trend: ReturnType<typeof computePulseTrend>;
  signal: ReturnType<typeof computeSignal>;
}

let cache: SeededPerson[] | null = null;

/** Builds (and memoises) the full seeded pilot dataset. */
export function getPilotData(): SeededPerson[] {
  if (cache) return cache;
  const from = weekDate(0);
  cache = ARCHETYPES.map((a, idx) => {
    const rand = rng(1000 + idx * 97);
    const events = buildEvents(a, rand);
    const pulses = buildPulses(a, events, rand);
    const rhythm = computePersonRhythm(a.person.id, events, DEFAULT_CONFIG, { from, to: ANCHOR });
    const trend = computePulseTrend(pulses);
    const signal = computeSignal(rhythm, trend);
    return { person: a.person, events, pulses, rhythm, trend, signal };
  });
  return cache;
}

export function getPerson(id: string): SeededPerson | undefined {
  return getPilotData().find((p) => p.person.id === id);
}

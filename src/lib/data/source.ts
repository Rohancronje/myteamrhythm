// The app's data source. Prefers a real Planning Center snapshot
// (.data/pco-snapshot.json, written by scripts/pco-sync.ts) and falls back to the
// deterministic sample data so the UI always renders. Everything downstream —
// dashboard, journey, analytics — reads through here, so wiring the DB later is a
// one-file change.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_CONFIG, computePersonRhythm } from "@/lib/rhythm/acwr";
import { computePulseTrend, computeSignal } from "@/lib/rhythm/wellbeing";
import type { PulseResponse, ServingEvent } from "@/lib/rhythm/types";
import { getPilotData, type Person, type SeededPerson } from "./seed";

interface SnapshotPerson {
  pcoId: string;
  handle: string;
  name: string;
  team: string;
  role: string;
  events: { serviceType: ServingEvent["serviceType"]; date: string; status: ServingEvent["status"] }[];
}
interface Snapshot {
  generatedAt: string;
  anchor: string;
  windowWeeks: number;
  org: string;
  assignments: number;
  people: SnapshotPerson[];
}

export interface DataSourceInfo {
  source: "planning-center" | "sample";
  org: string;
  generatedAt: string | null;
  people: number;
  /** Whether any pulse (feeling) data exists yet. */
  hasFeeling: boolean;
}

let cache: { data: SeededPerson[]; info: DataSourceInfo } | null = null;

function readSnapshot(): Snapshot | null {
  try {
    const raw = readFileSync(join(process.cwd(), ".data", "pco-snapshot.json"), "utf8");
    return JSON.parse(raw) as Snapshot;
  } catch {
    return null;
  }
}

function initials(name: string): string {
  return name.split(/\s+/).map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

/** Minimum serves in-window to be considered an active volunteer worth showing. */
const ACTIVE_MIN = 3;

function buildFromSnapshot(snap: Snapshot): SeededPerson[] {
  // Anchor to the most recent ACTUAL service, not the calendar date — otherwise
  // the current (not-yet-happened) week pads everyone's series with zeros and
  // deflates acute load across the whole team.
  let maxDate = snap.anchor;
  for (const p of snap.people) for (const e of p.events) if (e.date > maxDate) maxDate = e.date;
  const anchor = new Date(maxDate + "T00:00:00Z");
  const from = new Date(anchor);
  from.setUTCDate(from.getUTCDate() - snap.windowWeeks * 7);

  return snap.people
    .map((sp): SeededPerson => {
      const events: ServingEvent[] = sp.events.map((e) => ({
        personId: sp.pcoId,
        serviceType: e.serviceType,
        date: e.date,
        status: e.status,
      }));
      const person: Person = {
        id: sp.pcoId,
        handle: sp.handle,
        name: sp.name,
        initials: initials(sp.name),
        team: sp.team,
        role: sp.role,
      };
      // No pulse data from Planning Center — feeling arrives once check-ins begin.
      const pulses: PulseResponse[] = [];
      const rhythm = computePersonRhythm(sp.pcoId, events, DEFAULT_CONFIG, { from, to: anchor });
      const trend = computePulseTrend(pulses);
      const signal = computeSignal(rhythm, null);
      return { person, events, pulses, rhythm, trend, signal };
    })
    .filter((p) => p.events.filter((e) => e.status === "confirmed").length >= ACTIVE_MIN)
    .sort(
      (a, b) =>
        b.events.filter((e) => e.status === "confirmed").length -
        a.events.filter((e) => e.status === "confirmed").length,
    );
}

function load(): { data: SeededPerson[]; info: DataSourceInfo } {
  if (cache) return cache;

  const snap = readSnapshot();
  if (snap && snap.people.length) {
    const data = buildFromSnapshot(snap);
    cache = {
      data,
      info: {
        source: "planning-center",
        org: snap.org,
        generatedAt: snap.generatedAt,
        people: data.length,
        hasFeeling: data.some((p) => p.pulses.length > 0),
      },
    };
    return cache;
  }

  const data = getPilotData();
  cache = {
    data,
    info: {
      source: "sample",
      org: "City Impact · NS Family Services (sample)",
      generatedAt: null,
      people: data.length,
      hasFeeling: true,
    },
  };
  return cache;
}

export function getTeamData(): SeededPerson[] {
  return load().data;
}

export function getDataSourceInfo(): DataSourceInfo {
  return load().info;
}

export function getTeamPerson(id: string): SeededPerson | undefined {
  return load().data.find((p) => p.person.id === id);
}

/** Served at least once in the last `weeks` weeks of the window — the group for
 *  whom load is actionable *now* (vs. occasional volunteers currently resting). */
export function isRecentlyActive(p: SeededPerson, weeks = 2): boolean {
  const tail = p.rhythm.series.slice(-weeks);
  return tail.some((w) => w.rawLoad > 0);
}

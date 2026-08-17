// "Your next service" data. Reads upcoming services from Postgres (or snapshot),
// and resolves the next one a given person is rostered on. All real: future plans,
// call times, roster, and setlist come straight from Planning Center.

import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface UpcomingTime {
  name: string;
  startsAt: string;
  timeType: string;
}
export interface UpcomingRosterEntry {
  pcoId: string;
  name: string;
  position: string;
  team: string;
  status: string;
}
export interface UpcomingSong {
  title: string;
  key: string;
  bpm: number | null;
  position: number;
}
export interface UpcomingService {
  planId: string;
  date: string;
  serviceType: string;
  title: string;
  seriesTitle: string;
  times: UpcomingTime[];
  roster: UpcomingRosterEntry[];
  songs: UpcomingSong[];
}

let cache: Promise<UpcomingService[]> | null = null;

async function loadAll(): Promise<UpcomingService[]> {
  if (process.env.DATABASE_URL) {
    const { readUpcoming } = await import("@/db/read");
    return (await readUpcoming()) as unknown as UpcomingService[];
  }
  try {
    const snap = JSON.parse(readFileSync(join(process.cwd(), ".data", "pco-upcoming.json"), "utf8")) as {
      services: { planId: string; serviceDate: string; serviceType: string; title: string; seriesTitle: string; data: Omit<UpcomingService, "planId" | "date" | "serviceType" | "title" | "seriesTitle"> }[];
    };
    return snap.services.map((s) => ({ planId: s.planId, date: s.serviceDate, serviceType: s.serviceType, title: s.title, seriesTitle: s.seriesTitle, ...s.data }));
  } catch {
    return [];
  }
}

function load() {
  if (!cache) cache = loadAll();
  return cache;
}

const SERVICE_LABEL: Record<string, string> = {
  sunday_am: "Sunday AM",
  sunday_pm: "Sunday PM",
  wednesday_night: "Wednesday Night",
};
export function serviceLabel(k: string): string {
  return SERVICE_LABEL[k] ?? k;
}

/** All upcoming services, soonest first (today onward, NZ). */
export async function getUpcoming(): Promise<UpcomingService[]> {
  const { nzToday } = await import("@/lib/time");
  const today = nzToday();
  return (await load()).filter((s) => s.date >= today).sort((a, b) => a.date.localeCompare(b.date));
}

export interface PersonNextService {
  service: UpcomingService;
  myPosition: string;
}

/** The soonest upcoming service the person is rostered on, with their role. */
export async function getNextServiceForPerson(pcoId: string | undefined): Promise<PersonNextService | null> {
  if (!pcoId) return null;
  const upcoming = await getUpcoming();
  for (const s of upcoming) {
    const me = s.roster.find((r) => r.pcoId === pcoId);
    if (me) return { service: s, myPosition: me.position };
  }
  return null;
}

/** Whole-church next service (for admins / when the viewer isn't rostered soon). */
export async function getNextServiceOverall(): Promise<UpcomingService | null> {
  return (await getUpcoming())[0] ?? null;
}

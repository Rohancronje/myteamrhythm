// Songs Insights for the NS Worship Team. Built from the synced Planning Center
// setlists (song_services + song_slots) — all of which are worship sets. Surfaces,
// over a rolling window: the most-sung songs, each worship leader's signature
// (go-to) song, and the most common keys.

import { unstable_cache } from "next/cache";
import { nzToday } from "@/lib/time";

export interface SongCount {
  title: string;
  count: number;
}
export interface KeyCount {
  key: string;
  count: number;
}
export interface LeaderSignature {
  leader: string;
  song: string;
  timesLed: number; // times this leader led that song in the window
  sets: number; // total setlists this leader led in the window
}
export interface InsightWindow {
  months: number;
  sets: number; // number of setlists in the window
  distinctSongs: number;
  topSongs: SongCount[];
  topKeys: KeyCount[];
  signatures: LeaderSignature[];
}
export interface SongInsights {
  earliest: string | null; // earliest setlist date we hold (so the UI can be honest about coverage)
  sixMonths: InsightWindow;
  twelveMonths: InsightWindow;
}

interface Row {
  date: string; // YYYY-MM-DD
  planId: string;
  leader: string | null;
  title: string;
  key: string;
}

function monthsAgoISO(months: number): string {
  const [y, m, d] = nzToday().split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCMonth(dt.getUTCMonth() - months);
  return dt.toISOString().slice(0, 10);
}

async function fetchRows(): Promise<Row[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { getDb } = await import("@/db");
    const { songServices, songSlots } = await import("@/db/schema");
    const { eq, gte } = await import("drizzle-orm");
    const rows = await getDb()
      .select({ date: songServices.serviceDate, planId: songSlots.planId, leader: songServices.leader, title: songSlots.title, key: songSlots.keyName })
      .from(songSlots)
      .innerJoin(songServices, eq(songSlots.planId, songServices.planId))
      .where(gte(songServices.serviceDate, monthsAgoISO(12)));
    return rows.map((r) => ({ date: r.date, planId: r.planId, leader: r.leader, title: r.title, key: r.key }));
  } catch {
    return [];
  }
}

/** Rank map entries by count, desc, tie-broken by name. */
function ranked(counts: Map<string, number>): [string, number][] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function buildWindow(rows: Row[], months: number): InsightWindow {
  const cutoff = monthsAgoISO(months);
  const win = rows.filter((r) => r.date >= cutoff);

  // Most-sung songs — group case-insensitively, display the commonest casing.
  const songCounts = new Map<string, number>();
  const songDisplay = new Map<string, string>();
  const keyCounts = new Map<string, number>();
  for (const r of win) {
    const t = r.title.trim();
    if (t) {
      const k = t.toLowerCase();
      songCounts.set(k, (songCounts.get(k) ?? 0) + 1);
      if (!songDisplay.has(k)) songDisplay.set(k, t);
    }
    const key = r.key.trim();
    if (key) keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
  }

  // Signature song per leader — their most-led song, plus how many sets they led.
  const perLeaderSong = new Map<string, Map<string, number>>(); // leader -> title -> count
  const leaderSets = new Map<string, Set<string>>(); // leader -> planIds led
  for (const r of win) {
    const leader = (r.leader ?? "").trim();
    const t = r.title.trim();
    if (!leader || !t) continue;
    const m = perLeaderSong.get(leader) ?? new Map<string, number>();
    const k = t.toLowerCase();
    m.set(k, (m.get(k) ?? 0) + 1);
    perLeaderSong.set(leader, m);
    const sets = leaderSets.get(leader) ?? new Set<string>();
    sets.add(r.planId);
    leaderSets.set(leader, sets);
  }
  const signatures: LeaderSignature[] = [...perLeaderSong.entries()]
    .map(([leader, songs]) => {
      const [topKey, timesLed] = ranked(songs)[0];
      return { leader, song: songDisplay.get(topKey) ?? topKey, timesLed, sets: leaderSets.get(leader)?.size ?? 0 };
    })
    .filter((s) => s.sets >= 2) // a "go-to" needs at least a couple of sets to mean anything
    .sort((a, b) => b.sets - a.sets || b.timesLed - a.timesLed || a.leader.localeCompare(b.leader));

  return {
    months,
    sets: new Set(win.map((r) => r.planId)).size,
    distinctSongs: songCounts.size,
    topSongs: ranked(songCounts).slice(0, 15).map(([k, count]) => ({ title: songDisplay.get(k) ?? k, count })),
    topKeys: ranked(keyCounts).map(([key, count]) => ({ key, count })),
    signatures,
  };
}

const load = unstable_cache(
  async (): Promise<SongInsights> => {
    const rows = await fetchRows();
    const earliest = rows.reduce<string | null>((min, r) => (min === null || r.date < min ? r.date : min), null);
    return { earliest, sixMonths: buildWindow(rows, 6), twelveMonths: buildWindow(rows, 12) };
  },
  ["rhythm:song-insights"],
  { revalidate: 300, tags: ["songs"] },
);

export async function getSongInsights(): Promise<SongInsights> {
  return load();
}

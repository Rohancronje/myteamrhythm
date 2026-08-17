// Song Intelligence (handover Part B). Turns synced setlists into the analyses
// the doc scoped: rotation health (songs used vs dormant), a key/tempo library,
// and worship-leader → song/key correlation.

export interface SongSlot {
  songId: string;
  title: string;
  author: string;
  key: string;
  bpm: number | null;
}
export interface ServiceSet {
  date: string;
  serviceType: string;
  planId: string;
  leader: string | null;
  songs: SongSlot[];
}
export interface SongsSnapshot {
  generatedAt: string;
  anchor: string;
  windowWeeks: number;
  org: string;
  services: ServiceSet[];
}

const SERVICE_LABEL: Record<string, string> = {
  sunday_am: "Sunday AM",
  sunday_pm: "Sunday PM",
  wednesday_night: "Wednesday Night",
};
export function serviceLabel(k: string): string {
  return SERVICE_LABEL[k] ?? k;
}

function weeksBetween(a: string, b: string): number {
  const ms = new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime();
  return Math.round(ms / (7 * 864e5));
}
function mode<T>(xs: T[]): T | undefined {
  const c = new Map<T, number>();
  let best: T | undefined;
  let bestN = 0;
  for (const x of xs) {
    const n = (c.get(x) ?? 0) + 1;
    c.set(x, n);
    if (n > bestN) { bestN = n; best = x; }
  }
  return best;
}

export interface SongStat {
  title: string;
  author: string;
  timesPlayed: number;
  lastPlayed: string;
  weeksSinceLast: number;
  primaryKey: string;
  keys: string[];
  avgBpm: number | null;
}

export interface LeaderStat {
  name: string;
  timesLed: number;
  homeTurf: string; // service type label
  topKeys: string[];
  signatureSongs: string[];
  avgSetLength: number;
}

export interface SongIntel {
  org: string;
  anchor: string;
  totalServices: number;
  distinctSongs: number;
  inRotation: number; // sung in the last 6 weeks
  dormant: SongStat[]; // sung before, but not in the last 8 weeks
  avgPerSet: number;
  mostSung: SongStat[];
  leaders: LeaderStat[];
  keySpread: { key: string; count: number }[];
}

export function buildSongIntel(snap: SongsSnapshot): SongIntel {
  const anchor = snap.anchor;

  // Per-song aggregation.
  const bySong = new Map<string, { title: string; author: string; dates: string[]; keys: string[]; bpms: number[] }>();
  const keyCount = new Map<string, number>();
  let slotTotal = 0;

  for (const svc of snap.services) {
    for (const s of svc.songs) {
      slotTotal++;
      const id = s.title.trim().toLowerCase();
      const rec = bySong.get(id) ?? { title: s.title.trim(), author: s.author, dates: [], keys: [], bpms: [] };
      rec.dates.push(svc.date);
      if (s.key) { rec.keys.push(s.key); keyCount.set(s.key, (keyCount.get(s.key) ?? 0) + 1); }
      if (s.bpm) rec.bpms.push(s.bpm);
      if (!rec.author && s.author) rec.author = s.author;
      bySong.set(id, rec);
    }
  }

  const stats: SongStat[] = [...bySong.values()].map((r) => {
    const lastPlayed = r.dates.sort().at(-1)!;
    return {
      title: r.title,
      author: r.author,
      timesPlayed: r.dates.length,
      lastPlayed,
      weeksSinceLast: weeksBetween(lastPlayed, anchor),
      primaryKey: mode(r.keys) ?? "—",
      keys: [...new Set(r.keys)],
      avgBpm: r.bpms.length ? Math.round(r.bpms.reduce((a, b) => a + b, 0) / r.bpms.length) : null,
    };
  });

  const inRotation = stats.filter((s) => s.weeksSinceLast <= 6).length;
  const dormant = stats
    .filter((s) => s.weeksSinceLast >= 8 && s.timesPlayed >= 2)
    .sort((a, b) => b.weeksSinceLast - a.weeksSinceLast || b.timesPlayed - a.timesPlayed)
    .slice(0, 12);
  const mostSung = [...stats].sort((a, b) => b.timesPlayed - a.timesPlayed || a.weeksSinceLast - b.weeksSinceLast).slice(0, 12);

  // Leaders.
  const byLeader = new Map<string, { turfs: string[]; keys: string[]; songs: string[]; setLens: number[] }>();
  for (const svc of snap.services) {
    if (!svc.leader) continue;
    const rec = byLeader.get(svc.leader) ?? { turfs: [], keys: [], songs: [], setLens: [] };
    rec.turfs.push(serviceLabel(svc.serviceType));
    rec.setLens.push(svc.songs.length);
    for (const s of svc.songs) {
      if (s.key) rec.keys.push(s.key);
      rec.songs.push(s.title.trim());
    }
    byLeader.set(svc.leader, rec);
  }
  const leaders: LeaderStat[] = [...byLeader.entries()]
    .map(([name, r]) => {
      const songFreq = new Map<string, number>();
      for (const s of r.songs) songFreq.set(s, (songFreq.get(s) ?? 0) + 1);
      const keyFreq = new Map<string, number>();
      for (const k of r.keys) keyFreq.set(k, (keyFreq.get(k) ?? 0) + 1);
      return {
        name,
        timesLed: r.turfs.length,
        homeTurf: mode(r.turfs) ?? "—",
        topKeys: [...keyFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k),
        signatureSongs: [...songFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s),
        avgSetLength: r.setLens.length ? Math.round((r.setLens.reduce((a, b) => a + b, 0) / r.setLens.length) * 10) / 10 : 0,
      };
    })
    .sort((a, b) => b.timesLed - a.timesLed);

  const keySpread = [...keyCount.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);

  return {
    org: snap.org,
    anchor,
    totalServices: snap.services.length,
    distinctSongs: bySong.size,
    inRotation,
    dormant,
    avgPerSet: snap.services.length ? Math.round((slotTotal / snap.services.length) * 10) / 10 : 0,
    mostSung,
    leaders,
    keySpread,
  };
}

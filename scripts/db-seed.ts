// One-off: load the DB from the existing .data snapshots (no Planning Center
// round-trip). The live sync scripts write to the DB directly; this just backfills
// what's already been synced. Run: pnpm tsx scripts/db-seed.ts
import { readFileSync } from "node:fs";
import { writeRoster, writeSongs, writeUsers } from "../src/db/writers";

function loadEnv(path: string) {
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) process.env[m[1]] ??= m[2];
  }
}
loadEnv(".env.local");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

(async () => {
  // Roster
  const roster = JSON.parse(readFileSync(".data/pco-snapshot.json", "utf8")) as {
    windowWeeks: number;
    people: { pcoId: string; name: string; handle: string; team: string; role: string; events: { serviceType: string; date: string; planId: string; status: string; position: string }[] }[];
  };
  const personRows = roster.people.map((p) => ({ pcoId: p.pcoId, name: p.name, handle: p.handle, team: p.team, role: p.role }));
  const seen = new Set<string>();
  const eventRows = roster.people.flatMap((p) =>
    p.events.map((e) => ({ pcoId: p.pcoId, serviceType: e.serviceType, serviceDate: e.date, planId: e.planId, status: e.status, position: e.position || "" })),
  ).filter((e) => {
    const k = `${e.pcoId}|${e.planId}|${e.position}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  await writeRoster(personRows, eventRows, { windowWeeks: roster.windowWeeks, people: personRows.length, assignments: eventRows.length });
  console.log(`✓ roster → ${personRows.length} people, ${eventRows.length} events`);

  // Songs
  const songs = JSON.parse(readFileSync(".data/pco-songs.json", "utf8")) as {
    windowWeeks: number;
    services: { planId: string; date: string; serviceType: string; leader: string | null; songs: { songId: string; title: string; author: string; key: string; bpm: number | null }[] }[];
  };
  const serviceRows = songs.services.map((s) => ({ planId: s.planId, serviceDate: s.date, serviceType: s.serviceType, leader: s.leader }));
  const slotRows = songs.services.flatMap((s) => s.songs.map((song, i) => ({ planId: s.planId, songId: song.songId, title: song.title, author: song.author, keyName: song.key, bpm: song.bpm == null ? null : Math.round(song.bpm), position: i })));
  try {
    await writeSongs(serviceRows, slotRows, { windowWeeks: songs.windowWeeks, services: serviceRows.length, slots: slotRows.length });
    console.log(`✓ songs → ${serviceRows.length} services, ${slotRows.length} slots`);
  } catch (e) {
    const err = e as Error & { cause?: Error };
    console.error("songs write failed:", err.message);
    console.error("cause:", err.cause?.message ?? "(none)");
    process.exit(1);
  }

  // Users (from AUTH_USERS env) → users table.
  try {
    const authUsers = JSON.parse(process.env.AUTH_USERS ?? "[]") as { email: string; name: string; role: string; personId?: string; hash: string }[];
    if (authUsers.length) {
      await writeUsers(authUsers.map((u) => ({ email: u.email.toLowerCase(), name: u.name, role: u.role, personId: u.personId ?? null, passwordHash: u.hash })));
      console.log(`✓ users → ${authUsers.length} accounts`);
    }
  } catch (e) {
    console.error("users seed skipped:", (e as Error).message);
  }

  process.exit(0);
})();

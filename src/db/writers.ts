// Upsert helpers used by the sync scripts to populate Postgres from Planning
// Center. Idempotent — natural keys on Planning Center ids mean re-syncs update
// in place rather than duplicating.

import { inArray, sql as dsql } from "drizzle-orm";
import { getDb } from "./index";
import { people, servingEvents, songServices, songSlots, syncState, upcomingServices, users } from "./schema";

export interface UpcomingRow {
  planId: string;
  serviceDate: string;
  serviceType: string;
  title: string | null;
  seriesTitle: string | null;
  data: unknown; // { times, roster, songs }
}

/** Upsert a single upcoming service (used by the webhook for one changed plan). */
export async function writeOneUpcoming(row: UpcomingRow) {
  await getDb()
    .insert(upcomingServices)
    .values(row)
    .onConflictDoUpdate({
      target: upcomingServices.planId,
      set: { serviceDate: row.serviceDate, serviceType: row.serviceType, title: row.title, seriesTitle: row.seriesTitle, data: row.data },
    });
}

/** Remove an upcoming service (plan destroyed / moved to past). */
export async function deleteUpcoming(planId: string) {
  await getDb().delete(upcomingServices).where(inArray(upcomingServices.planId, [planId]));
}

/** Replace the whole upcoming window (small, forward-looking set). */
export async function writeUpcoming(rows: UpcomingRow[], meta?: unknown) {
  const db = getDb();
  await db.delete(upcomingServices).where(dsql`true`);
  for (const c of chunk(rows, 200)) {
    if (c.length) await db.insert(upcomingServices).values(c);
  }
  await db
    .insert(syncState)
    .values({ key: "upcoming", meta: meta ?? null })
    .onConflictDoUpdate({ target: syncState.key, set: { meta: meta ?? null, lastSyncedAt: nowSql() } });
}

export interface UserRow {
  email: string;
  name: string;
  role: string;
  personId: string | null;
  passwordHash: string;
}

/** Upsert app accounts by email. */
export async function writeUsers(rows: UserRow[]) {
  const db = getDb();
  for (const u of rows) {
    await db
      .insert(users)
      .values(u)
      .onConflictDoUpdate({
        target: users.email,
        set: { name: u.name, role: u.role, personId: u.personId, passwordHash: u.passwordHash },
      });
  }
}

function chunk<T>(xs: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

export interface PersonRow {
  pcoId: string;
  name: string;
  handle: string;
  team: string;
  role: string;
}
export interface EventRow {
  pcoId: string;
  serviceType: string;
  serviceDate: string;
  planId: string;
  status: string;
  position: string;
}

export async function writeRoster(peopleRows: PersonRow[], eventRows: EventRow[], meta?: unknown) {
  const db = getDb();

  for (const c of chunk(peopleRows, 500)) {
    await db
      .insert(people)
      .values(c)
      .onConflictDoUpdate({
        target: people.pcoId,
        set: {
          name: sqlExcluded("name"),
          handle: sqlExcluded("handle"),
          team: sqlExcluded("team"),
          role: sqlExcluded("role"),
        },
      });
  }

  for (const c of chunk(eventRows, 500)) {
    await db
      .insert(servingEvents)
      .values(c)
      .onConflictDoUpdate({
        target: [servingEvents.pcoId, servingEvents.planId, servingEvents.position],
        set: { status: sqlExcluded("status"), serviceDate: sqlExcluded("service_date"), serviceType: sqlExcluded("service_type") },
      });
  }

  await db
    .insert(syncState)
    .values({ key: "roster", meta: meta ?? null })
    .onConflictDoUpdate({ target: syncState.key, set: { meta: meta ?? null, lastSyncedAt: nowSql() } });
}

export interface ServiceRow {
  planId: string;
  serviceDate: string;
  serviceType: string;
  leader: string | null;
}
export interface SlotRow {
  planId: string;
  songId: string;
  title: string;
  author: string;
  keyName: string;
  bpm: number | null;
  position: number;
}

export async function writeSongs(services: ServiceRow[], slots: SlotRow[], meta?: unknown) {
  const db = getDb();

  for (const c of chunk(services, 500)) {
    await db
      .insert(songServices)
      .values(c)
      .onConflictDoUpdate({
        target: songServices.planId,
        set: { leader: sqlExcluded("leader"), serviceDate: sqlExcluded("service_date"), serviceType: sqlExcluded("service_type") },
      });
  }

  // Replace slots wholesale for the synced plans so removed songs disappear.
  const planIds = [...new Set(slots.map((s) => s.planId))];
  for (const c of chunk(planIds, 200)) {
    await db.delete(songSlots).where(inArray(songSlots.planId, c));
  }
  for (const c of chunk(slots, 500)) {
    await db.insert(songSlots).values(c);
  }

  await db
    .insert(syncState)
    .values({ key: "songs", meta: meta ?? null })
    .onConflictDoUpdate({ target: syncState.key, set: { meta: meta ?? null, lastSyncedAt: nowSql() } });
}

// Small helpers to reference the conflicting row / now() without importing sql at
// every call site.
import { sql } from "drizzle-orm";
function sqlExcluded(col: string) {
  return sql.raw(`excluded.${col}`);
}
function nowSql() {
  return sql`now()`;
}

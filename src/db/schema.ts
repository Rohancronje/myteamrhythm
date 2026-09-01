// Database schema (Drizzle / Postgres) — matches the current app model.
// Single-tenant for the NS Family Services pilot. Load is read from Planning
// Center; feeling from pulse check-ins; setlists power Song Intelligence; users
// drive auth + roles. Kept deliberately flat and idempotent (natural keys on the
// Planning Center ids) so re-syncs upsert cleanly.

import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** People, keyed by their Planning Center person id. */
export const people = pgTable("people", {
  pcoId: text("pco_id").primaryKey(),
  name: text("name").notNull(),
  handle: text("handle").notNull(), // pseudonym for aggregate/lead views
  team: text("team").notNull().default("Unassigned"),
  role: text("role").notNull().default("Team"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** One serving assignment on one dated service. Dedupe-by-planId happens in the
 *  engine; here we keep every (person, plan, position) row for fidelity. */
export const servingEvents = pgTable(
  "serving_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pcoId: text("pco_id").notNull().references(() => people.pcoId, { onDelete: "cascade" }),
    serviceType: text("service_type").notNull(),
    serviceDate: date("service_date").notNull(),
    planId: text("plan_id").notNull(),
    status: text("status").notNull(),
    position: text("position").notNull().default(""),
  },
  (t) => [
    index("serving_person_date_idx").on(t.pcoId, t.serviceDate),
    uniqueIndex("serving_natural_uq").on(t.pcoId, t.planId, t.position),
  ],
);

/** One service's setlist header + worship leader. */
export const songServices = pgTable("song_services", {
  planId: text("plan_id").primaryKey(),
  serviceDate: date("service_date").notNull(),
  serviceType: text("service_type").notNull(),
  leader: text("leader"),
});

/** Songs within a setlist. Replaced wholesale per plan on sync. */
export const songSlots = pgTable(
  "song_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: text("plan_id").notNull().references(() => songServices.planId, { onDelete: "cascade" }),
    songId: text("song_id").notNull().default(""),
    title: text("title").notNull(),
    author: text("author").notNull().default(""),
    keyName: text("key_name").notNull().default(""),
    bpm: integer("bpm"),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("song_slot_plan_idx").on(t.planId)],
);

/** Post-service pulse (the four handover questions). Stored by person id for now;
 *  aggregate views read it pseudonymously. */
export const pulseResponses = pgTable(
  "pulse_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pcoId: text("pco_id"),
    service: text("service"),
    serviceDate: date("service_date"),
    energy: text("energy").notNull(), // more / same / less
    worshipOrWork: text("worship_or_work").notNull(),
    word: text("word"),
    thanks: text("thanks"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("pulse_pco_idx").on(t.pcoId)],
);

/** App accounts. role: admin | coach | leader | member. personId links a login to
 *  their own person; `teams` lists the Planning Center teams a coach is responsible
 *  for connecting with. */
export const users = pgTable("users", {
  email: text("email").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("member"),
  personId: text("person_id"),
  teams: jsonb("teams").$type<string[]>().default([]),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Volunteer connection platform ────────────────────────────────────────────
// Admin-created teams + manually-added/imported volunteers. This is the primary
// data source now (Planning Center is parked). Coaches are assigned to teams
// many-to-many and work their connection plan off these rows.

/** A team an admin creates. Volunteers and coaches attach to it. */
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  campus: text("campus"),
  pcoTeams: jsonb("pco_teams").$type<string[]>().default([]), // linked Planning Center teams (people.team) for member sync
  createdBy: text("created_by"),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** A volunteer on a team. Contact details live inline (unlike the PCO model). */
export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    birthday: date("birthday"),
    role: text("role"),
    active: boolean("active").notNull().default(true),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("team_members_team_idx").on(t.teamId)],
);

/** Coach ↔ team assignment (many-to-many). Source of truth for coach scoping. */
export const teamCoaches = pgTable(
  "team_coaches",
  {
    teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
    coachEmail: text("coach_email").notNull(),
  },
  (t) => [
    uniqueIndex("team_coach_uq").on(t.teamId, t.coachEmail),
    index("team_coach_email_idx").on(t.coachEmail),
  ],
);

/** Contact details + birthday per person. Kept apart from `people` (which is
 *  replaced wholesale on each PCO sync) so manually-added/imported details survive.
 *  source: pco | import | manual. */
export const personContacts = pgTable("person_contacts", {
  pcoId: text("pco_id").primaryKey(),
  email: text("email"),
  phone: text("phone"),
  birthday: date("birthday"),
  source: text("source").notNull().default("manual"),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** A logged connection — a coach reached out to a person. The note is explicitly
 *  FYI-for-next-time, not confidential record-keeping (enforced by UI copy). */
export const connections = pgTable(
  "connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pcoId: text("pco_id").notNull(),
    coachEmail: text("coach_email").notNull(),
    note: text("note"),
    contactedAt: timestamp("contacted_at").defaultNow().notNull(),
  },
  (t) => [index("connections_pco_idx").on(t.pcoId), index("connections_coach_idx").on(t.coachEmail)],
);

/** Owner-visible audit trail of consequential admin actions (account/role/team
 *  changes). Append-only; never blocks the action it records. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    at: timestamp("at").defaultNow().notNull(),
    actorEmail: text("actor_email"),
    actorName: text("actor_name"),
    action: text("action").notNull(), // e.g. "account.create", "role.change", "coach.remove"
    target: text("target"), // who/what it affected
    detail: text("detail"), // human-readable summary
  },
  (t) => [index("audit_at_idx").on(t.at)],
);

/** Upcoming (future) services for the "your next service" view. Small forward
 *  window, replaced wholesale on each sync. `data` holds times, roster, songs. */
export const upcomingServices = pgTable("upcoming_services", {
  planId: text("plan_id").primaryKey(),
  serviceDate: date("service_date").notNull(),
  serviceType: text("service_type").notNull(),
  title: text("title"),
  seriesTitle: text("series_title"),
  data: jsonb("data").notNull(),
});

/** Peer thank-yous from pulse Q4. Recipient known; sender optional (only if the
 *  pulse was filled while signed in). Surfaced back to the recipient. */
export const thankYous = pgTable(
  "thank_yous",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientPcoId: text("recipient_pco_id").notNull(),
    senderPcoId: text("sender_pco_id"),
    senderName: text("sender_name"),
    service: text("service"),
    serviceDate: date("service_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("thanks_recipient_idx").on(t.recipientPcoId)],
);

/** Team Bible reading plan — one passage per day, tied to a sermon series. */
export const readingPlan = pgTable("reading_plan", {
  day: date("day").primaryKey(),
  reference: text("reference").notNull(), // e.g. "Genesis 1:1-25"
  seriesTitle: text("series_title"),
  note: text("note"),
});

/** Per-person reading marks (which days they read) — drives the reading streak. */
export const readingMarks = pgTable(
  "reading_marks",
  {
    pcoId: text("pco_id").notNull(),
    day: date("day").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("reading_mark_uq").on(t.pcoId, t.day)],
);

/** Song → theme + scripture tagging (backoffice). Lyrics are NEVER stored. */
export const songTags = pgTable("song_tags", {
  title: text("title").primaryKey(), // song title (lowercased key)
  displayTitle: text("display_title").notNull(),
  themes: jsonb("themes").notNull().default([]),
  scriptureRefs: jsonb("scripture_refs").notNull().default([]),
  status: text("status").notNull().default("pending"), // pending | tagged | needs_review
  taggedBy: text("tagged_by"),
  taggedAt: timestamp("tagged_at"),
  notes: text("notes"),
});

/** Pastoral follow-up state per person — deliberately structured, NOT free-text.
 *  Records only *that* someone was contacted and the broad outcome, so care is
 *  tracked without keeping written notes about a volunteer. One current row per
 *  person, upserted by pastoral admins. outcome: null | 'all_well' | 'needs_support'. */
export const pastoralChecks = pgTable("pastoral_checks", {
  pcoId: text("pco_id").primaryKey(),
  reachedOut: boolean("reached_out").notNull().default(false),
  checkedIn: boolean("checked_in").notNull().default(false),
  outcome: text("outcome"),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Sync bookkeeping (last run + counts) per source. */
export const syncState = pgTable("sync_state", {
  key: text("key").primaryKey(), // 'roster' | 'songs'
  lastSyncedAt: timestamp("last_synced_at")
    .default(sql`now()`)
    .notNull(),
  meta: jsonb("meta"),
});

// Database schema (Drizzle / Postgres).
//
// Designed so that the privacy architecture is enforceable at the data layer,
// not just in the UI: pulse responses are keyed by a pseudonymous `participant`
// handle, and the mapping from a real person to that handle lives in a separate
// table that only the pseudonymiser (server, with the salt) can reproduce.
//
// Multi-tenant-aware from day one (every row carries an `orgId`) even though the
// pilot is a single church — cheaper now than a migration later.

import { relations, sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const serviceTypeKey = pgEnum("service_type_key", [
  "sunday_am",
  "sunday_pm",
  "wednesday_night",
]);
export const scheduleStatus = pgEnum("schedule_status", [
  "confirmed",
  "unconfirmed",
  "declined",
]);
export const viewerRole = pgEnum("viewer_role", [
  "team_member",
  "team_lead",
  "pastoral_care",
]);

export const organisations = pgTable("organisations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const people = pgTable(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organisations.id),
    // The Planning Center person id (source of truth for identity).
    pcoPersonId: text("pco_person_id").notNull(),
    fullName: text("full_name").notNull(),
    role: viewerRole("role").notNull().default("team_member"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("people_pco_uq").on(t.orgId, t.pcoPersonId)],
);

export const serviceTypes = pgTable("service_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organisations.id),
  pcoServiceTypeId: text("pco_service_type_id").notNull(),
  key: serviceTypeKey("key").notNull(),
  name: text("name").notNull(),
});

/** One serving assignment on one dated service — the atomic load unit. */
export const servingEvents = pgTable(
  "serving_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organisations.id),
    personId: uuid("person_id").notNull().references(() => people.id),
    serviceType: serviceTypeKey("service_type").notNull(),
    serviceDate: date("service_date").notNull(),
    status: scheduleStatus("status").notNull(),
    position: text("position"),
    roleWeight: real("role_weight").default(1),
    // Idempotency key from PCO (plan_person id) so re-syncs don't duplicate.
    pcoPlanPersonId: text("pco_plan_person_id"),
  },
  (t) => [
    index("serving_person_date_idx").on(t.personId, t.serviceDate),
    uniqueIndex("serving_pco_uq").on(t.orgId, t.pcoPlanPersonId),
  ],
);

/**
 * Maps a person to their stable pseudonymous handle. This is the ONLY table
 * that links identity to pulse data; unlocking an individual means joining
 * through here, which the app gates behind role + risk threshold.
 */
export const pseudonyms = pgTable(
  "pseudonyms",
  {
    orgId: uuid("org_id").notNull().references(() => organisations.id),
    personId: uuid("person_id").notNull().references(() => people.id),
    participantHandle: text("participant_handle").notNull(),
  },
  (t) => [
    uniqueIndex("pseudonym_person_uq").on(t.personId),
    uniqueIndex("pseudonym_handle_uq").on(t.orgId, t.participantHandle),
  ],
);

/** Post-service pulse — stored against the handle, never the person directly. */
export const pulseResponses = pgTable(
  "pulse_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organisations.id),
    participantHandle: text("participant_handle").notNull(),
    serviceDate: date("service_date").notNull(),
    energy: integer("energy").notNull(),
    meaning: integer("meaning").notNull(),
    connection: integer("connection").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("pulse_handle_date_idx").on(t.participantHandle, t.serviceDate)],
);

/** Audit log: every time an individual is unlocked, we record who and why. */
export const unlockEvents = pgTable("unlock_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organisations.id),
  viewerPersonId: uuid("viewer_person_id").notNull().references(() => people.id),
  subjectPersonId: uuid("subject_person_id").notNull().references(() => people.id),
  reason: text("reason").notNull(),
  attentionLevel: text("attention_level").notNull(),
  createdAt: timestamp("created_at")
    .default(sql`now()`)
    .notNull(),
});

export const peopleRelations = relations(people, ({ one, many }) => ({
  org: one(organisations, { fields: [people.orgId], references: [organisations.id] }),
  events: many(servingEvents),
  pseudonym: one(pseudonyms, { fields: [people.id], references: [pseudonyms.personId] }),
}));

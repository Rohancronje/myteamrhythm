CREATE TABLE "people" (
	"pco_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"handle" text NOT NULL,
	"team" text DEFAULT 'Unassigned' NOT NULL,
	"role" text DEFAULT 'Team' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pulse_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pco_id" text,
	"service" text,
	"service_date" date,
	"energy" text NOT NULL,
	"worship_or_work" text NOT NULL,
	"word" text,
	"thanks" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "serving_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pco_id" text NOT NULL,
	"service_type" text NOT NULL,
	"service_date" date NOT NULL,
	"plan_id" text NOT NULL,
	"status" text NOT NULL,
	"position" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "song_services" (
	"plan_id" text PRIMARY KEY NOT NULL,
	"service_date" date NOT NULL,
	"service_type" text NOT NULL,
	"leader" text
);
--> statement-breakpoint
CREATE TABLE "song_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" text NOT NULL,
	"song_id" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"author" text DEFAULT '' NOT NULL,
	"key_name" text DEFAULT '' NOT NULL,
	"bpm" integer,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_state" (
	"key" text PRIMARY KEY NOT NULL,
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	"meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"email" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"person_id" text,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "serving_events" ADD CONSTRAINT "serving_events_pco_id_people_pco_id_fk" FOREIGN KEY ("pco_id") REFERENCES "public"."people"("pco_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_slots" ADD CONSTRAINT "song_slots_plan_id_song_services_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."song_services"("plan_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pulse_pco_idx" ON "pulse_responses" USING btree ("pco_id");--> statement-breakpoint
CREATE INDEX "serving_person_date_idx" ON "serving_events" USING btree ("pco_id","service_date");--> statement-breakpoint
CREATE UNIQUE INDEX "serving_natural_uq" ON "serving_events" USING btree ("pco_id","plan_id","position");--> statement-breakpoint
CREATE INDEX "song_slot_plan_idx" ON "song_slots" USING btree ("plan_id");
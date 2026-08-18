CREATE TABLE "reading_marks" (
	"pco_id" text NOT NULL,
	"day" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_plan" (
	"day" date PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"series_title" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "song_tags" (
	"title" text PRIMARY KEY NOT NULL,
	"display_title" text NOT NULL,
	"themes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scripture_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"tagged_by" text,
	"tagged_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "thank_yous" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_pco_id" text NOT NULL,
	"sender_pco_id" text,
	"sender_name" text,
	"service" text,
	"service_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "reading_mark_uq" ON "reading_marks" USING btree ("pco_id","day");--> statement-breakpoint
CREATE INDEX "thanks_recipient_idx" ON "thank_yous" USING btree ("recipient_pco_id");
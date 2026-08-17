CREATE TABLE "upcoming_services" (
	"plan_id" text PRIMARY KEY NOT NULL,
	"service_date" date NOT NULL,
	"service_type" text NOT NULL,
	"title" text,
	"series_title" text,
	"data" jsonb NOT NULL
);

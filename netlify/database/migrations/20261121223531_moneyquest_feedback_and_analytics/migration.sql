CREATE TABLE "analytics_daily" (
	"day" text,
	"metric" text,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "analytics_daily_pkey" PRIMARY KEY("day","metric")
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" text PRIMARY KEY,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

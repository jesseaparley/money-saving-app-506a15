CREATE TABLE "check_ins" (
	"profile_id" text,
	"local_date" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_ins_pkey" PRIMARY KEY("profile_id","local_date")
);
--> statement-breakpoint
CREATE TABLE "deposits" (
	"id" text PRIMARY KEY,
	"profile_id" text NOT NULL,
	"goal_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" text PRIMARY KEY,
	"profile_id" text NOT NULL,
	"title" text NOT NULL,
	"target_cents" integer NOT NULL,
	"saved_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quest_runs" (
	"id" text PRIMARY KEY,
	"profile_id" text NOT NULL,
	"quest_id" text NOT NULL,
	"period" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"savings_cents" integer DEFAULT 0 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"goal_id" text,
	"local_date" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "quest_run_period_unique" ON "quest_runs" ("profile_id","quest_id","period");--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_profile_id_profiles_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_profile_id_profiles_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_goal_id_goals_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_profile_id_profiles_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "quest_runs" ADD CONSTRAINT "quest_runs_profile_id_profiles_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "quest_runs" ADD CONSTRAINT "quest_runs_goal_id_goals_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE SET NULL;
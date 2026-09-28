CREATE TYPE "public"."condition" AS ENUM('normal', 'sick', 'injured', 'fatigued', 'other');--> statement-breakpoint
CREATE TYPE "public"."distance_label" AS ENUM('5K', '10K', 'HM', 'FM', 'other');--> statement-breakpoint
CREATE TYPE "public"."draft_status" AS ENUM('pending', 'saved', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."feel" AS ENUM('great', 'good', 'okay', 'tough', 'bad');--> statement-breakpoint
CREATE TYPE "public"."program_status" AS ENUM('draft', 'active', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."program_type" AS ENUM('main', 'supporting');--> statement-breakpoint
CREATE TYPE "public"."race_status" AS ENUM('planned', 'done', 'dns', 'dnf');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('planned', 'done', 'skipped', 'modified');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('easy', 'long', 'tempo', 'interval', 'recovery', 'race', 'strength', 'hiit', 'mobility', 'cross', 'rest', 'other');--> statement-breakpoint
CREATE TYPE "public"."set_status" AS ENUM('done', 'partial', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."source" AS ENUM('manual', 'json', 'mcp', 'notion');--> statement-breakpoint
CREATE TYPE "public"."sport" AS ENUM('run', 'strength', 'hiit', 'cycling', 'swim', 'mobility', 'walk', 'rest', 'other');--> statement-breakpoint
CREATE TYPE "public"."units" AS ENUM('metric', 'imperial');--> statement-breakpoint
CREATE TYPE "public"."week_start" AS ENUM('monday', 'sunday');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"started_at" timestamp with time zone,
	"sport" "sport" NOT NULL,
	"session_type" "session_type",
	"title" text,
	"duration_sec" integer,
	"distance_m" integer,
	"avg_hr" integer,
	"max_hr" integer,
	"calories" integer,
	"training_load" integer,
	"rpe" integer,
	"feel" "feel",
	"notes" text,
	"coach_notes" text,
	"source" "source" DEFAULT 'manual' NOT NULL,
	"planned_session_id" uuid,
	"effort_distance_m" integer,
	"zone_snapshot" jsonb,
	"extra_metrics" jsonb,
	"screenshot_paths" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activities_rpe_range" CHECK ("activities"."rpe" IS NULL OR ("activities"."rpe" BETWEEN 1 AND 10)),
	CONSTRAINT "activities_duration_positive" CHECK ("activities"."duration_sec" IS NULL OR "activities"."duration_sec" > 0),
	CONSTRAINT "activities_distance_nonneg" CHECK ("activities"."distance_m" IS NULL OR "activities"."distance_m" >= 0),
	CONSTRAINT "activities_avg_hr_range" CHECK ("activities"."avg_hr" IS NULL OR ("activities"."avg_hr" BETWEEN 30 AND 240)),
	CONSTRAINT "activities_max_hr_range" CHECK ("activities"."max_hr" IS NULL OR ("activities"."max_hr" BETWEEN 30 AND 240))
);
--> statement-breakpoint
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "activity_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source" "source" NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "draft_status" DEFAULT 'pending' NOT NULL,
	"activity_id" uuid,
	"expires_at" timestamp with time zone DEFAULT now() + interval '14 days' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_drafts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "activity_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"planned_item_id" uuid,
	"block_name" text,
	"position" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "activity_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"set_number" integer NOT NULL,
	"reps" integer,
	"duration_sec" integer,
	"distance_m" integer,
	"load_kg" numeric(6, 2),
	"status" "set_status" DEFAULT 'done' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_sets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "athlete_metrics_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"max_hr" integer,
	"resting_hr" integer,
	"lthr" integer,
	"hr_zones" jsonb,
	"vo2max" numeric(5, 2),
	"target_cadence_spm" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "athlete_metrics_history_max_hr_range" CHECK ("athlete_metrics_history"."max_hr" IS NULL OR ("athlete_metrics_history"."max_hr" BETWEEN 60 AND 240)),
	CONSTRAINT "athlete_metrics_history_resting_hr_range" CHECK ("athlete_metrics_history"."resting_hr" IS NULL OR ("athlete_metrics_history"."resting_hr" BETWEEN 20 AND 120))
);
--> statement-breakpoint
ALTER TABLE "athlete_metrics_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "daily_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"condition" "condition" DEFAULT 'normal' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planned_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"name" text,
	"rounds" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planned_blocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planned_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"block_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"sets" integer,
	"reps" integer,
	"duration_sec" integer,
	"distance_m" integer,
	"load_kg" numeric(6, 2),
	"rest_sec" integer,
	"target" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planned_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planned_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"program_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"sport" "sport" NOT NULL,
	"session_type" "session_type",
	"title" text,
	"description" text,
	"target_duration_min_sec" integer,
	"target_duration_max_sec" integer,
	"target_distance_m" integer,
	"target_intensity" text,
	"status" "session_status" DEFAULT 'planned' NOT NULL,
	"status_note" text,
	"activity_id" uuid,
	"race_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planned_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"timezone" text DEFAULT 'Asia/Jakarta' NOT NULL,
	"units" "units" DEFAULT 'metric' NOT NULL,
	"week_start" "week_start" DEFAULT 'monday' NOT NULL,
	"widget_token_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "program_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"focus" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "program_phases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "program_type" DEFAULT 'main' NOT NULL,
	"status" "program_status" DEFAULT 'draft' NOT NULL,
	"goal" text,
	"start_date" date,
	"end_date" date,
	"goal_race_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "programs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "races" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"location" text,
	"distance_m" integer,
	"distance_label" "distance_label",
	"status" "race_status" DEFAULT 'planned' NOT NULL,
	"target_time_sec" integer,
	"strategy" text,
	"chip_time_sec" integer,
	"watch_time_sec" integer,
	"rank_overall" integer,
	"total_overall" integer,
	"rank_gender" integer,
	"total_gender" integer,
	"rank_category" integer,
	"total_category" integer,
	"report" text,
	"activity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "races" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "run_metrics" (
	"activity_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"avg_pace_sec_per_km" integer,
	"cadence_spm" integer,
	"stride_length_m" numeric(4, 2),
	"gct_avg_ms" integer,
	"gct_min_ms" integer,
	"balance_left_pct" numeric(4, 1),
	"balance_right_pct" numeric(4, 1),
	"vo2max" numeric(5, 2),
	"elevation_gain_m" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "run_metrics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "week_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"context" text,
	"principles" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "week_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_planned_session_id_planned_sessions_id_fk" FOREIGN KEY ("planned_session_id") REFERENCES "public"."planned_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_drafts" ADD CONSTRAINT "activity_drafts_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_items" ADD CONSTRAINT "activity_items_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_items" ADD CONSTRAINT "activity_items_planned_item_id_planned_items_id_fk" FOREIGN KEY ("planned_item_id") REFERENCES "public"."planned_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_sets" ADD CONSTRAINT "activity_sets_item_id_activity_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."activity_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_blocks" ADD CONSTRAINT "planned_blocks_session_id_planned_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."planned_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_items" ADD CONSTRAINT "planned_items_block_id_planned_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."planned_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_sessions" ADD CONSTRAINT "planned_sessions_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_phases" ADD CONSTRAINT "program_phases_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_metrics" ADD CONSTRAINT "run_metrics_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_metrics_history_user_date_uniq" ON "athlete_metrics_history" USING btree ("user_id","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_notes_user_date_uniq" ON "daily_notes" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_widget_token_hash_uniq" ON "profiles" USING btree ("widget_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "programs_one_main_active_per_user" ON "programs" USING btree ("user_id") WHERE type = 'main' AND status = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "week_notes_user_week_uniq" ON "week_notes" USING btree ("user_id","week_start");
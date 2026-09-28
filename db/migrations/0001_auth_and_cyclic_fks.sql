-- Foreign keys that drizzle-kit can't safely emit from schema.ts.
-- 1) FKs to auth.users(id) with ON DELETE CASCADE — declaring auth.users in the
--    Drizzle schema makes drizzle-kit try to (re)create it.
-- 2) Cyclic FKs between programs / races / planned_sessions / activities.

-- ============================================================
-- 1. auth.users foreign keys (ON DELETE CASCADE)
-- ============================================================

ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "athlete_metrics_history"
  ADD CONSTRAINT "athlete_metrics_history_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "daily_notes"
  ADD CONSTRAINT "daily_notes_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "programs"
  ADD CONSTRAINT "programs_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "program_phases"
  ADD CONSTRAINT "program_phases_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "week_notes"
  ADD CONSTRAINT "week_notes_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "planned_sessions"
  ADD CONSTRAINT "planned_sessions_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "planned_blocks"
  ADD CONSTRAINT "planned_blocks_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "planned_items"
  ADD CONSTRAINT "planned_items_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "activities"
  ADD CONSTRAINT "activities_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "run_metrics"
  ADD CONSTRAINT "run_metrics_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "activity_items"
  ADD CONSTRAINT "activity_items_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "activity_sets"
  ADD CONSTRAINT "activity_sets_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "activity_drafts"
  ADD CONSTRAINT "activity_drafts_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "races"
  ADD CONSTRAINT "races_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint

-- ============================================================
-- 2. Cyclic FKs between programs / races / planned_sessions / activities
-- ============================================================

ALTER TABLE "programs"
  ADD CONSTRAINT "programs_goal_race_id_fk"
  FOREIGN KEY ("goal_race_id") REFERENCES "races"("id") ON DELETE SET NULL;
--> statement-breakpoint

ALTER TABLE "races"
  ADD CONSTRAINT "races_activity_id_fk"
  FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL;
--> statement-breakpoint

ALTER TABLE "planned_sessions"
  ADD CONSTRAINT "planned_sessions_activity_id_fk"
  FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL;
--> statement-breakpoint

ALTER TABLE "planned_sessions"
  ADD CONSTRAINT "planned_sessions_race_id_fk"
  FOREIGN KEY ("race_id") REFERENCES "races"("id") ON DELETE SET NULL;

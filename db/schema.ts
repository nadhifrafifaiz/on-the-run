import { sql } from "drizzle-orm";
import {
  check,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Supabase manages auth.users. FK constraints to auth.users(id) with
// ON DELETE CASCADE are added by 0001_auth_and_cyclic_fks.sql — they can't
// live in the Drizzle schema without confusing drizzle-kit into recreating
// the auth.users table.

// -------------------- Enums --------------------
export const sportEnum = pgEnum("sport", [
  "run",
  "strength",
  "hiit",
  "cycling",
  "swim",
  "mobility",
  "walk",
  "rest",
  "other",
]);

export const sessionTypeEnum = pgEnum("session_type", [
  "easy",
  "long",
  "tempo",
  "interval",
  "recovery",
  "race",
  "strength",
  "hiit",
  "mobility",
  "cross",
  "rest",
  "other",
]);

export const programTypeEnum = pgEnum("program_type", ["main", "supporting"]);
export const programStatusEnum = pgEnum("program_status", ["draft", "active", "completed", "archived"]);
export const sessionStatusEnum = pgEnum("session_status", [
  "planned",
  "done",
  "skipped",
  "modified",
]);
export const setStatusEnum = pgEnum("set_status", ["done", "partial", "failed", "skipped"]);
export const feelEnum = pgEnum("feel", ["great", "good", "okay", "tough", "bad"]);
export const sourceEnum = pgEnum("source", ["manual", "json", "mcp", "notion"]);
export const draftStatusEnum = pgEnum("draft_status", ["pending", "saved", "discarded"]);
export const raceStatusEnum = pgEnum("race_status", ["planned", "done", "dns", "dnf"]);
export const unitsEnum = pgEnum("units", ["metric", "imperial"]);
export const weekStartEnum = pgEnum("week_start", ["monday", "sunday"]);
export const conditionEnum = pgEnum("condition", [
  "normal",
  "sick",
  "injured",
  "fatigued",
  "other",
]);
export const distanceLabelEnum = pgEnum("distance_label", ["5K", "10K", "HM", "FM", "other"]);

export const timeOfDayEnum = pgEnum("time_of_day", [
  "dawn",
  "morning",
  "day",
  "afternoon",
  "evening",
  "night",
]);
export const terrainEnum = pgEnum("terrain", [
  "flat",
  "rolling",
  "hilly",
  "mountainous",
  "mixed",
  "treadmill",
  "track",
]);
export const weatherEnum = pgEnum("weather", [
  "sunny",
  "cloudy",
  "rainy",
  "hot",
  "cold",
  "windy",
]);

// -------------------- Base column helpers --------------------
// FK to auth.users(id) ON DELETE CASCADE is added by the supplementary migration.
const userFk = () => uuid("user_id").notNull();

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// -------------------- Profile & metrics --------------------
export const profiles = pgTable(
  "profiles",
  {
    // FK to auth.users(id) added by supplementary migration.
    userId: uuid("user_id").primaryKey(),
    displayName: text("display_name"),
    timezone: text("timezone").notNull().default("Asia/Jakarta"),
    units: unitsEnum("units").notNull().default("metric"),
    weekStart: weekStartEnum("week_start").notNull().default("monday"),
    widgetTokenHash: text("widget_token_hash"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("profiles_widget_token_hash_uniq").on(t.widgetTokenHash)],
).enableRLS();

export const athleteMetricsHistory = pgTable(
  "athlete_metrics_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userFk(),
    effectiveFrom: date("effective_from").notNull(),
    maxHr: integer("max_hr"),
    restingHr: integer("resting_hr"),
    lthr: integer("lthr"),
    hrZones: jsonb("hr_zones").$type<{
      z1?: { min: number; max: number };
      z2?: { min: number; max: number };
      z3?: { min: number; max: number };
      z4?: { min: number; max: number };
      z5?: { min: number; max: number };
    }>(),
    vo2max: numeric("vo2max", { precision: 5, scale: 2 }),
    targetCadenceSpm: integer("target_cadence_spm"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("athlete_metrics_history_user_date_uniq").on(t.userId, t.effectiveFrom),
    check("athlete_metrics_history_max_hr_range", sql`${t.maxHr} IS NULL OR (${t.maxHr} BETWEEN 60 AND 240)`),
    check("athlete_metrics_history_resting_hr_range", sql`${t.restingHr} IS NULL OR (${t.restingHr} BETWEEN 20 AND 120)`),
  ],
).enableRLS();

export const dailyNotes = pgTable(
  "daily_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userFk(),
    date: date("date").notNull(),
    condition: conditionEnum("condition").notNull().default("normal"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("daily_notes_user_date_uniq").on(t.userId, t.date)],
).enableRLS();

// -------------------- Plan --------------------
// Note: programs.goalRaceId → races and races.activityId → activities are added
// via a supplementary migration to avoid Drizzle circular imports.
export const programs = pgTable(
  "programs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userFk(),
    name: text("name").notNull(),
    type: programTypeEnum("type").notNull().default("main"),
    status: programStatusEnum("status").notNull().default("draft"),
    goal: text("goal"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    goalRaceId: uuid("goal_race_id"), // FK added later
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("programs_one_main_active_per_user")
      .on(t.userId)
      .where(sql`type = 'main' AND status = 'active'`),
  ],
).enableRLS();

export const programPhases = pgTable(
  "program_phases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userFk(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    focus: text("focus"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
).enableRLS();

export const weekNotes = pgTable(
  "week_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userFk(),
    weekStart: date("week_start").notNull(),
    context: text("context"),
    principles: text("principles").array(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("week_notes_user_week_uniq").on(t.userId, t.weekStart)],
).enableRLS();

export const plannedSessions = pgTable(
  "planned_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userFk(),
    date: date("date").notNull(),
    programId: uuid("program_id").references(() => programs.id, { onDelete: "set null" }),
    position: integer("position").notNull().default(0),
    sport: sportEnum("sport").notNull(),
    sessionType: sessionTypeEnum("session_type"),
    title: text("title"),
    description: text("description"),
    targetDurationMinSec: integer("target_duration_min_sec"),
    targetDurationMaxSec: integer("target_duration_max_sec"),
    targetDistanceM: integer("target_distance_m"),
    targetIntensity: text("target_intensity"),
    status: sessionStatusEnum("status").notNull().default("planned"),
    statusNote: text("status_note"),
    activityId: uuid("activity_id"), // FK added later (circular with activities)
    raceId: uuid("race_id"), // FK added later
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
).enableRLS();

export const plannedBlocks = pgTable(
  "planned_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userFk(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => plannedSessions.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    name: text("name"),
    rounds: integer("rounds").notNull().default(1),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
).enableRLS();

export const plannedItems = pgTable(
  "planned_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userFk(),
    blockId: uuid("block_id")
      .notNull()
      .references(() => plannedBlocks.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    name: text("name").notNull(),
    sets: integer("sets"),
    reps: integer("reps"),
    durationSec: integer("duration_sec"),
    distanceM: integer("distance_m"),
    loadKg: numeric("load_kg", { precision: 6, scale: 2 }),
    restSec: integer("rest_sec"),
    target: text("target"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
).enableRLS();

// -------------------- Log --------------------
export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userFk(),
    date: date("date").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    sport: sportEnum("sport").notNull(),
    sessionType: sessionTypeEnum("session_type"),
    title: text("title"),
    durationSec: integer("duration_sec"),
    distanceM: integer("distance_m"),
    avgHr: integer("avg_hr"),
    maxHr: integer("max_hr"),
    calories: integer("calories"),
    trainingLoad: integer("training_load"),
    rpe: integer("rpe"),
    feel: feelEnum("feel"),
    notes: text("notes"),
    coachNotes: text("coach_notes"),
    source: sourceEnum("source").notNull().default("manual"),
    plannedSessionId: uuid("planned_session_id").references(() => plannedSessions.id, {
      onDelete: "set null",
    }),
    effortDistanceM: integer("effort_distance_m"),
    zoneSnapshot: jsonb("zone_snapshot"),
    timeOfDay: timeOfDayEnum("time_of_day"),
    terrain: terrainEnum("terrain"),
    weather: weatherEnum("weather"),
    extraMetrics: jsonb("extra_metrics"),
    screenshotPaths: text("screenshot_paths").array(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("activities_rpe_range", sql`${t.rpe} IS NULL OR (${t.rpe} BETWEEN 1 AND 10)`),
    check("activities_duration_positive", sql`${t.durationSec} IS NULL OR ${t.durationSec} > 0`),
    check("activities_distance_nonneg", sql`${t.distanceM} IS NULL OR ${t.distanceM} >= 0`),
    check("activities_avg_hr_range", sql`${t.avgHr} IS NULL OR (${t.avgHr} BETWEEN 30 AND 240)`),
    check("activities_max_hr_range", sql`${t.maxHr} IS NULL OR (${t.maxHr} BETWEEN 30 AND 240)`),
  ],
).enableRLS();

export const runMetrics = pgTable(
  "run_metrics",
  {
    activityId: uuid("activity_id")
      .primaryKey()
      .references(() => activities.id, { onDelete: "cascade" }),
    userId: userFk(),
    avgPaceSecPerKm: integer("avg_pace_sec_per_km"),
    cadenceSpm: integer("cadence_spm"),
    strideLengthM: numeric("stride_length_m", { precision: 4, scale: 2 }),
    gctAvgMs: integer("gct_avg_ms"),
    gctMinMs: integer("gct_min_ms"),
    balanceLeftPct: numeric("balance_left_pct", { precision: 4, scale: 1 }),
    balanceRightPct: numeric("balance_right_pct", { precision: 4, scale: 1 }),
    vo2max: numeric("vo2max", { precision: 5, scale: 2 }),
    elevationGainM: integer("elevation_gain_m"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
).enableRLS();

export const activityItems = pgTable(
  "activity_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userFk(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    plannedItemId: uuid("planned_item_id").references(() => plannedItems.id, {
      onDelete: "set null",
    }),
    blockName: text("block_name"),
    position: integer("position").notNull().default(0),
    name: text("name").notNull(),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
).enableRLS();

export const activitySets = pgTable(
  "activity_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userFk(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => activityItems.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    reps: integer("reps"),
    durationSec: integer("duration_sec"),
    distanceM: integer("distance_m"),
    loadKg: numeric("load_kg", { precision: 6, scale: 2 }),
    status: setStatusEnum("status").notNull().default("done"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
).enableRLS();

export const activityDrafts = pgTable(
  "activity_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userFk(),
    source: sourceEnum("source").notNull(),
    payload: jsonb("payload").notNull(),
    status: draftStatusEnum("status").notNull().default("pending"),
    activityId: uuid("activity_id").references(() => activities.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '14 days'`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
).enableRLS();

// -------------------- Race --------------------
export const races = pgTable(
  "races",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userFk(),
    name: text("name").notNull(),
    date: date("date").notNull(),
    location: text("location"),
    distanceM: integer("distance_m"),
    distanceLabel: distanceLabelEnum("distance_label"),
    status: raceStatusEnum("status").notNull().default("planned"),
    targetTimeSec: integer("target_time_sec"),
    strategy: text("strategy"),
    chipTimeSec: integer("chip_time_sec"),
    watchTimeSec: integer("watch_time_sec"),
    rankOverall: integer("rank_overall"),
    totalOverall: integer("total_overall"),
    rankGender: integer("rank_gender"),
    totalGender: integer("total_gender"),
    rankCategory: integer("rank_category"),
    totalCategory: integer("total_category"),
    report: text("report"),
    activityId: uuid("activity_id"), // FK added later (circular with activities via plannedSessions)
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
).enableRLS();

// -------------------- API tokens (for widgets / external clients) --------------------
export const apiTokens = pgTable(
  "api_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userFk(),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    tokenPrefix: text("token_prefix").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: createdAt(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
).enableRLS();

// -------------------- Type exports --------------------
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Program = typeof programs.$inferSelect;
export type NewProgram = typeof programs.$inferInsert;
export type PlannedSession = typeof plannedSessions.$inferSelect;
export type NewPlannedSession = typeof plannedSessions.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type Race = typeof races.$inferSelect;
export type NewRace = typeof races.$inferInsert;
export type AthleteMetrics = typeof athleteMetricsHistory.$inferSelect;
export type NewAthleteMetrics = typeof athleteMetricsHistory.$inferInsert;

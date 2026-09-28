import { z } from "zod";
import {
  conditionZ,
  feelZ,
  isoDateZ,
  programStatusZ,
  programTypeZ,
  sessionStatusZ,
  sessionTypeZ,
  setStatusZ,
  sourceZ,
  sportZ,
  terrainZ,
  timeOfDayZ,
  unitsZ,
  weatherZ,
  weekStartZ,
} from "./enums";

// -------------------- Profile --------------------
export const profileInputZ = z.object({
  displayName: z.string().max(80).optional(),
  timezone: z.string().min(1).default("Asia/Jakarta"),
  units: unitsZ.default("metric"),
  weekStart: weekStartZ.default("monday"),
});
// z.input keeps fields with defaults optional in the caller-facing type.
export type ProfileInput = z.input<typeof profileInputZ>;

// -------------------- Athlete metrics --------------------
export const hrZoneZ = z.object({
  min: z.number().int().positive(),
  max: z.number().int().positive(),
});

export const athleteMetricsInputZ = z.object({
  effectiveFrom: isoDateZ,
  maxHr: z.number().int().min(60).max(240).optional(),
  restingHr: z.number().int().min(20).max(120).optional(),
  lthr: z.number().int().min(60).max(240).optional(),
  hrZones: z
    .object({
      z1: hrZoneZ.optional(),
      z2: hrZoneZ.optional(),
      z3: hrZoneZ.optional(),
      z4: hrZoneZ.optional(),
      z5: hrZoneZ.optional(),
    })
    .optional(),
  vo2max: z.number().positive().max(100).optional(),
  targetCadenceSpm: z.number().int().min(30).max(250).optional(),
  notes: z.string().optional(),
});
export type AthleteMetricsInput = z.input<typeof athleteMetricsInputZ>;

// -------------------- Programs --------------------
export const programInputZ = z.object({
  name: z.string().min(1).max(120),
  type: programTypeZ.default("main"),
  status: programStatusZ.default("draft"),
  goal: z.string().optional(),
  startDate: isoDateZ.optional(),
  endDate: isoDateZ.optional(),
  goalRaceId: z.string().uuid().optional(),
  notes: z.string().optional(),
});
export type ProgramInput = z.input<typeof programInputZ>;

// -------------------- Sessions (form-level) --------------------
export const plannedItemInputZ = z.object({
  name: z.string().min(1),
  position: z.number().int().nonnegative().default(0),
  sets: z.number().int().positive().nullable().optional(),
  reps: z.number().int().positive().nullable().optional(),
  durationSec: z.number().int().positive().nullable().optional(),
  distanceM: z.number().int().nonnegative().nullable().optional(),
  loadKg: z.number().nonnegative().nullable().optional(),
  restSec: z.number().int().nonnegative().nullable().optional(),
  target: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const plannedBlockInputZ = z.object({
  name: z.string().optional(),
  position: z.number().int().nonnegative().default(0),
  rounds: z.number().int().positive().default(1),
  notes: z.string().optional(),
  items: z.array(plannedItemInputZ).default([]),
});

export const plannedSessionInputZ = z.object({
  date: isoDateZ,
  programId: z.string().uuid().nullable().optional(),
  position: z.number().int().nonnegative().default(0),
  sport: sportZ,
  sessionType: sessionTypeZ.nullable().optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  targetDurationMinSec: z.number().int().positive().nullable().optional(),
  targetDurationMaxSec: z.number().int().positive().nullable().optional(),
  targetDistanceM: z.number().int().nonnegative().nullable().optional(),
  targetIntensity: z.string().nullable().optional(),
  status: sessionStatusZ.default("planned"),
  blocks: z.array(plannedBlockInputZ).default([]),
});
export type PlannedSessionInput = z.input<typeof plannedSessionInputZ>;

// -------------------- Activity log (form input for activities.log) --------------------
export const activitySetInputZ = z.object({
  setNumber: z.number().int().positive(),
  reps: z.number().int().nonnegative().nullable().optional(),
  durationSec: z.number().int().positive().nullable().optional(),
  distanceM: z.number().int().nonnegative().nullable().optional(),
  loadKg: z.number().nonnegative().nullable().optional(),
  status: setStatusZ.default("done"),
  notes: z.string().nullable().optional(),
});

export const activityItemInputZ = z.object({
  name: z.string().min(1),
  blockName: z.string().nullable().optional(),
  plannedItemId: z.string().uuid().nullable().optional(),
  position: z.number().int().nonnegative().default(0),
  notes: z.string().nullable().optional(),
  sets: z.array(activitySetInputZ).default([]),
});

export const runMetricsInputZ = z.object({
  avgPaceSecPerKm: z.number().int().positive().nullable().optional(),
  cadenceSpm: z.number().int().positive().nullable().optional(),
  strideLengthM: z.number().positive().nullable().optional(),
  gctAvgMs: z.number().int().positive().nullable().optional(),
  gctMinMs: z.number().int().positive().nullable().optional(),
  balanceLeftPct: z.number().nonnegative().nullable().optional(),
  balanceRightPct: z.number().nonnegative().nullable().optional(),
  vo2max: z.number().positive().nullable().optional(),
  elevationGainM: z.number().int().nonnegative().nullable().optional(),
});

export const activityLogInputZ = z.object({
  date: isoDateZ,
  startedAt: z.string().datetime().nullable().optional(),
  sport: sportZ,
  sessionType: sessionTypeZ.nullable().optional(),
  title: z.string().nullable().optional(),
  durationSec: z.number().int().positive().nullable().optional(),
  distanceM: z.number().int().nonnegative().nullable().optional(),
  avgHr: z.number().int().positive().nullable().optional(),
  maxHr: z.number().int().positive().nullable().optional(),
  calories: z.number().int().nonnegative().nullable().optional(),
  trainingLoad: z.number().int().nonnegative().nullable().optional(),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
  feel: feelZ.nullable().optional(),
  notes: z.string().nullable().optional(),
  coachNotes: z.string().nullable().optional(),
  source: sourceZ.default("manual"),
  plannedSessionId: z.string().uuid().nullable().optional(),
  effortDistanceM: z.number().int().positive().nullable().optional(),
  timeOfDay: timeOfDayZ.nullable().optional(),
  terrain: terrainZ.nullable().optional(),
  weather: weatherZ.nullable().optional(),
  extraMetrics: z.record(z.string(), z.unknown()).nullable().optional(),
  screenshotPaths: z.array(z.string()).nullable().optional(),
  run: runMetricsInputZ.nullable().optional(),
  items: z.array(activityItemInputZ).default([]),
  draftId: z.string().uuid().nullable().optional(),
});
export type ActivityLogInput = z.input<typeof activityLogInputZ>;

// -------------------- Daily notes --------------------
export const dailyNoteInputZ = z.object({
  date: isoDateZ,
  condition: conditionZ.default("normal"),
  notes: z.string().optional(),
});
export type DailyNoteInput = z.input<typeof dailyNoteInputZ>;

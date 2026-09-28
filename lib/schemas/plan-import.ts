import { z } from "zod";
import { isoDateZ, sessionTypeZ, sportZ, programTypeZ } from "./enums";

export const PLAN_SCHEMA_VERSION = 1;

export const planItemZ = z.object({
  name: z.string().min(1),
  sets: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  duration_sec: z.number().int().positive().optional(),
  distance_m: z.number().int().nonnegative().optional(),
  load_kg: z.number().nonnegative().optional(),
  rest_sec: z.number().int().nonnegative().optional(),
  target: z.string().optional(),
  notes: z.string().optional(),
});

export const planBlockZ = z.object({
  name: z.string().optional(),
  rounds: z.number().int().positive().default(1),
  items: z.array(planItemZ).default([]),
  notes: z.string().optional(),
});

export const planSessionZ = z.object({
  date: isoDateZ,
  sport: sportZ,
  session_type: sessionTypeZ.optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  // nonnegative (allows 0 for rest/strength — user may pass explicit 0)
  target_duration_min: z.number().nonnegative().optional(),
  target_duration_max: z.number().nonnegative().optional(),
  target_distance_km: z.number().nonnegative().optional(),
  target_intensity: z.string().optional(),
  blocks: z.array(planBlockZ).default([]),
});

export const weekNoteZ = z.object({
  week_start: isoDateZ,
  context: z.string().optional(),
  principles: z.array(z.string()).default([]),
});

export const planPhaseZ = z.object({
  name: z.string().min(1).max(80),
  start_date: isoDateZ,
  end_date: isoDateZ,
  focus: z.string().max(500).optional(),
});

export const planImportZ = z.object({
  schema: z.literal("plan"),
  version: z.literal(PLAN_SCHEMA_VERSION),
  program: z
    .object({
      name: z.string().min(1),
      type: programTypeZ.default("main"),
      goal: z.string().optional(),
      start_date: isoDateZ.optional(),
      end_date: isoDateZ.optional(),
      notes: z.string().optional(),
    })
    .optional(),
  phases: z.array(planPhaseZ).default([]),
  week_notes: z.array(weekNoteZ).default([]),
  sessions: z.array(planSessionZ).default([]),
});

// z.input so callers can omit fields with defaults (phases, week_notes, sessions).
export type PlanImport = z.input<typeof planImportZ>;
export type PlanSession = z.input<typeof planSessionZ>;

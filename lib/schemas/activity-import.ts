import { z } from "zod";
import { isoDateZ, sessionTypeZ, setStatusZ, sportZ } from "./enums";

export const ACTIVITY_SCHEMA_VERSION = 1;

// "h:mm:ss" or "mm:ss"
const durationStrZ = z
  .string()
  .regex(/^\d+:\d{2}(:\d{2})?$/, "expected mm:ss or h:mm:ss");

// pace as "m:ss" (min per km)
const paceStrZ = z.string().regex(/^\d+:\d{2}$/, "expected m:ss pace");

// "49.5/50.5"
const balanceStrZ = z.string().regex(/^\d+(\.\d+)?\/\d+(\.\d+)?$/, "expected L/R e.g. 49.5/50.5");

export const activitySetImportZ = z.object({
  reps: z.number().int().nonnegative().optional(),
  duration_sec: z.number().int().positive().optional(),
  distance_m: z.number().int().nonnegative().optional(),
  load_kg: z.number().nonnegative().optional(),
  status: setStatusZ.default("done"),
  notes: z.string().optional(),
});

export const activityItemImportZ = z.object({
  block_name: z.string().optional(),
  name: z.string().min(1),
  notes: z.string().optional(),
  sets: z.array(activitySetImportZ).default([]),
});

export const runMetricsImportZ = z.object({
  avg_pace: paceStrZ.optional(),
  cadence_spm: z.number().int().positive().optional(),
  gct_avg_ms: z.number().int().positive().optional(),
  gct_min_ms: z.number().int().positive().optional(),
  balance: balanceStrZ.optional(),
  vo2max: z.number().positive().optional(),
  stride_length_m: z.number().positive().optional(),
  elevation_gain_m: z.number().int().nonnegative().optional(),
});

export const activityImportZ = z.object({
  schema: z.literal("activity"),
  version: z.literal(ACTIVITY_SCHEMA_VERSION),
  date: isoDateZ,
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:mm
  sport: sportZ,
  session_type: sessionTypeZ.optional(),
  title: z.string().optional(),
  duration: durationStrZ.optional(),
  distance_km: z.number().nonnegative().optional(),
  avg_hr: z.number().int().positive().optional(),
  max_hr: z.number().int().positive().optional(),
  calories: z.number().int().nonnegative().optional(),
  training_load: z.number().int().nonnegative().optional(),
  run: runMetricsImportZ.optional(),
  items: z.array(activityItemImportZ).default([]),
  extra_metrics: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().optional(),
});

export type ActivityImport = z.infer<typeof activityImportZ>;

// -------------------- Coercion helpers --------------------

export function durationToSec(input: string): number {
  const parts = input.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

export function paceToSecPerKm(input: string): number {
  const [m, s] = input.split(":").map(Number);
  return m * 60 + s;
}

export function balanceToLR(input: string): { left: number; right: number } {
  const [l, r] = input.split("/").map(Number);
  return { left: l, right: r };
}

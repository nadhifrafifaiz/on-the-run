import { durationToSec, paceToSecPerKm } from "@/lib/utils/parsers";
import type { ActivityImport } from "@/lib/schemas/activity-import";
import type { LogFormPrefill } from "./log-activity-form";

// Convert a validated activity-import payload (from a draft) into the
// LogActivityForm prefill shape.
export function prefillFromActivityImport(input: ActivityImport): LogFormPrefill {
  return {
    date: input.date,
    startedAtTime: input.start_time ?? null,
    sport: input.sport,
    sessionType: input.session_type ?? null,
    title: input.title ?? null,
    durationSec: input.duration ? durationToSec(input.duration) : null,
    distanceM: input.distance_km != null ? Math.round(input.distance_km * 1000) : null,
    avgHr: input.avg_hr ?? null,
    maxHr: input.max_hr ?? null,
    calories: input.calories ?? null,
    trainingLoad: input.training_load ?? null,
    notes: input.notes ?? null,
    source: "json",
    run: input.run
      ? {
          avgPaceSecPerKm: input.run.avg_pace ? paceToSecPerKm(input.run.avg_pace) : null,
          cadenceSpm: input.run.cadence_spm ?? null,
          elevationGainM: input.run.elevation_gain_m ?? null,
        }
      : null,
    items: input.items?.map((it) => ({
      name: it.name,
      sets: it.sets.map((s) => ({
        reps: s.reps ?? null,
        loadKg: s.load_kg ?? null,
        durationSec: s.duration_sec ?? null,
        status: s.status,
      })),
    })),
  };
}


import type { HydratedActivity } from "@/lib/services/activities";
import type { LogFormPrefill } from "./log-activity-form";

// Convert a hydrated activity (from getHydratedActivity) into form prefill shape.
export function prefillFromActivity(a: HydratedActivity): LogFormPrefill {
  const { activity, runMetrics: rm, items } = a;
  return {
    date: activity.date,
    startedAtTime: activity.startedAt
      ? activity.startedAt.toISOString().slice(11, 16) // "HH:mm"
      : null,
    sport: activity.sport,
    sessionType: activity.sessionType,
    title: activity.title,
    durationSec: activity.durationSec,
    distanceM: activity.distanceM,
    avgHr: activity.avgHr,
    maxHr: activity.maxHr,
    calories: activity.calories,
    trainingLoad: activity.trainingLoad,
    rpe: activity.rpe,
    feel: activity.feel,
    notes: activity.notes,
    plannedSessionId: activity.plannedSessionId,
    source: activity.source,
    timeOfDay: activity.timeOfDay,
    terrain: activity.terrain,
    weather: activity.weather,
    run: rm
      ? {
          avgPaceSecPerKm: rm.avgPaceSecPerKm,
          cadenceSpm: rm.cadenceSpm,
          elevationGainM: rm.elevationGainM,
        }
      : null,
    items: items.map((it) => ({
      name: it.item.name,
      sets: it.sets.map((s) => ({
        reps: s.reps,
        loadKg: s.loadKg != null ? Number(s.loadKg) : null,
        durationSec: s.durationSec,
        status: s.status,
      })),
    })),
  };
}

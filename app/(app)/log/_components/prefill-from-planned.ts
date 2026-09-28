import type { HydratedSession } from "@/lib/services/stats";
import type { LogFormPrefill } from "./log-activity-form";

// Convert a hydrated planned session into log form prefill.
// Expands planned blocks/items into activity items+sets so user starts with
// the plan pre-filled (spec: "default terisi dari plan, tap set untuk ubah").
export function prefillFromPlannedSession(p: HydratedSession): LogFormPrefill {
  const items: NonNullable<LogFormPrefill["items"]> = [];

  for (const { block, items: blockItems } of p.blocks) {
    const rounds = Math.max(1, block.rounds ?? 1);
    for (const planned of blockItems) {
      // planned.sets = count (default 1). Each set inherits reps/duration/load/distance.
      const setCount = (planned.sets ?? 1) * rounds;
      const perSet = {
        reps: planned.reps ?? null,
        loadKg: planned.loadKg != null ? Number(planned.loadKg) : null,
        durationSec: planned.durationSec ?? null,
        status: "done",
      };
      items.push({
        name: planned.name,
        sets: Array.from({ length: Math.max(1, setCount) }, () => ({ ...perSet })),
      });
    }
  }

  return {
    date: p.session.date,
    sport: p.session.sport,
    sessionType: p.session.sessionType,
    title: p.session.title,
    plannedSessionId: p.session.id,
    items,
  };
}

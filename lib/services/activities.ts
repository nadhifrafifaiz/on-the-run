import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  activities,
  activityDrafts,
  activityItems,
  activitySets,
  plannedSessions,
  runMetrics,
} from "@/db/schema";
import { ServiceError } from "@/lib/utils/errors";
import { assertInRange } from "@/lib/utils/validation";
import { activityLogInputZ, type ActivityLogInput } from "@/lib/schemas/forms";
import { zoneSnapshotAt } from "./metrics";

function toNumericString(v: number | null | undefined): string | null {
  return v === null || v === undefined ? null : v.toString();
}

/**
 * Transactionally insert an activity with (optional) run metrics, items, and sets.
 * Links to a planned session and/or draft if provided.
 * Fills zone_snapshot from athlete_metrics_history effective at the activity date.
 */
export async function logActivity(userId: string, input: ActivityLogInput) {
  const parsed = activityLogInputZ.parse(input);

  // Range validation — anything AI-generated should get sanity checked here.
  assertInRange(parsed.durationSec ?? null, "durationSec", "duration");
  assertInRange(parsed.distanceM ?? null, "distanceM", "distance");
  assertInRange(parsed.avgHr ?? null, "avgHr", "avg HR");
  assertInRange(parsed.maxHr ?? null, "maxHr", "max HR");
  assertInRange(parsed.rpe ?? null, "rpe", "RPE");
  assertInRange(parsed.calories ?? null, "calories", "calories");
  assertInRange(parsed.trainingLoad ?? null, "trainingLoad", "training load");
  if (parsed.run) {
    assertInRange(parsed.run.avgPaceSecPerKm ?? null, "paceSecPerKm", "pace");
    assertInRange(parsed.run.cadenceSpm ?? null, "cadenceSpm", "cadence");
    assertInRange(parsed.run.gctAvgMs ?? null, "gctMs", "GCT avg");
    assertInRange(parsed.run.gctMinMs ?? null, "gctMs", "GCT min");
    assertInRange(parsed.run.elevationGainM ?? null, "elevationGainM", "elevation gain");
  }

  const zoneSnapshot = await zoneSnapshotAt(userId, parsed.date);

  return db.transaction(async (tx) => {
    // Verify planned session ownership before we link to it.
    if (parsed.plannedSessionId) {
      const [ps] = await tx
        .select({ id: plannedSessions.id })
        .from(plannedSessions)
        .where(
          and(
            eq(plannedSessions.userId, userId),
            eq(plannedSessions.id, parsed.plannedSessionId),
          ),
        )
        .limit(1);
      if (!ps) throw new ServiceError("NOT_FOUND", "Planned session not found for this user");
    }

    // Verify draft ownership before we mark it saved.
    if (parsed.draftId) {
      const [d] = await tx
        .select({ id: activityDrafts.id })
        .from(activityDrafts)
        .where(and(eq(activityDrafts.userId, userId), eq(activityDrafts.id, parsed.draftId)))
        .limit(1);
      if (!d) throw new ServiceError("NOT_FOUND", "Draft not found for this user");
    }

    const [activity] = await tx
      .insert(activities)
      .values({
        userId,
        date: parsed.date,
        startedAt: parsed.startedAt ? new Date(parsed.startedAt) : null,
        sport: parsed.sport,
        sessionType: parsed.sessionType ?? null,
        title: parsed.title ?? null,
        durationSec: parsed.durationSec ?? null,
        distanceM: parsed.distanceM ?? null,
        avgHr: parsed.avgHr ?? null,
        maxHr: parsed.maxHr ?? null,
        calories: parsed.calories ?? null,
        trainingLoad: parsed.trainingLoad ?? null,
        rpe: parsed.rpe ?? null,
        feel: parsed.feel ?? null,
        notes: parsed.notes ?? null,
        coachNotes: parsed.coachNotes ?? null,
        source: parsed.source,
        plannedSessionId: parsed.plannedSessionId ?? null,
        effortDistanceM: parsed.effortDistanceM ?? null,
        zoneSnapshot: zoneSnapshot ?? null,
        timeOfDay: parsed.timeOfDay ?? null,
        terrain: parsed.terrain ?? null,
        weather: parsed.weather ?? null,
        extraMetrics: parsed.extraMetrics ?? null,
        screenshotPaths: parsed.screenshotPaths ?? null,
      })
      .returning();

    // run_metrics only for sport='run'
    if (parsed.sport === "run" && parsed.run) {
      await tx.insert(runMetrics).values({
        activityId: activity.id,
        userId,
        avgPaceSecPerKm: parsed.run.avgPaceSecPerKm ?? null,
        cadenceSpm: parsed.run.cadenceSpm ?? null,
        strideLengthM: toNumericString(parsed.run.strideLengthM),
        gctAvgMs: parsed.run.gctAvgMs ?? null,
        gctMinMs: parsed.run.gctMinMs ?? null,
        balanceLeftPct: toNumericString(parsed.run.balanceLeftPct),
        balanceRightPct: toNumericString(parsed.run.balanceRightPct),
        vo2max: toNumericString(parsed.run.vo2max),
        elevationGainM: parsed.run.elevationGainM ?? null,
      });
    }

    // Items + sets
    for (const item of parsed.items) {
      const [ai] = await tx
        .insert(activityItems)
        .values({
          userId,
          activityId: activity.id,
          plannedItemId: item.plannedItemId ?? null,
          blockName: item.blockName ?? null,
          position: item.position,
          name: item.name,
          notes: item.notes ?? null,
        })
        .returning();

      if (item.sets.length > 0) {
        await tx.insert(activitySets).values(
          item.sets.map((s) => ({
            userId,
            itemId: ai.id,
            setNumber: s.setNumber,
            reps: s.reps ?? null,
            durationSec: s.durationSec ?? null,
            distanceM: s.distanceM ?? null,
            loadKg: toNumericString(s.loadKg ?? null),
            status: s.status,
            notes: s.notes ?? null,
          })),
        );
      }
    }

    // Link planned session
    if (parsed.plannedSessionId) {
      await tx
        .update(plannedSessions)
        .set({ status: "done", activityId: activity.id, updatedAt: new Date() })
        .where(
          and(
            eq(plannedSessions.userId, userId),
            eq(plannedSessions.id, parsed.plannedSessionId),
          ),
        );
    }

    // Mark draft as saved
    if (parsed.draftId) {
      await tx
        .update(activityDrafts)
        .set({ status: "saved", activityId: activity.id, updatedAt: new Date() })
        .where(and(eq(activityDrafts.userId, userId), eq(activityDrafts.id, parsed.draftId)));
    }

    return activity;
  });
}

/**
 * Update an existing activity. Replace-all semantics for items+sets and run_metrics.
 * Does NOT re-link planned_session (kept locked to current link — user can edit that
 * from the session detail page if needed).
 */
export async function updateActivityLog(
  userId: string,
  activityId: string,
  input: ActivityLogInput,
) {
  const parsed = activityLogInputZ.parse(input);

  assertInRange(parsed.durationSec ?? null, "durationSec", "duration");
  assertInRange(parsed.distanceM ?? null, "distanceM", "distance");
  assertInRange(parsed.avgHr ?? null, "avgHr", "avg HR");
  assertInRange(parsed.maxHr ?? null, "maxHr", "max HR");
  assertInRange(parsed.rpe ?? null, "rpe", "RPE");
  assertInRange(parsed.calories ?? null, "calories", "calories");
  assertInRange(parsed.trainingLoad ?? null, "trainingLoad", "training load");
  if (parsed.run) {
    assertInRange(parsed.run.avgPaceSecPerKm ?? null, "paceSecPerKm", "pace");
    assertInRange(parsed.run.cadenceSpm ?? null, "cadenceSpm", "cadence");
    assertInRange(parsed.run.gctAvgMs ?? null, "gctMs", "GCT avg");
    assertInRange(parsed.run.gctMinMs ?? null, "gctMs", "GCT min");
    assertInRange(parsed.run.elevationGainM ?? null, "elevationGainM", "elevation gain");
  }

  return db.transaction(async (tx) => {
    // Verify ownership.
    const [existing] = await tx
      .select()
      .from(activities)
      .where(and(eq(activities.userId, userId), eq(activities.id, activityId)))
      .limit(1);
    if (!existing) throw new ServiceError("NOT_FOUND", "Activity not found");

    // Update main activity row. Keep source, plannedSessionId, zoneSnapshot untouched.
    await tx
      .update(activities)
      .set({
        date: parsed.date,
        startedAt: parsed.startedAt ? new Date(parsed.startedAt) : null,
        sport: parsed.sport,
        sessionType: parsed.sessionType ?? null,
        title: parsed.title ?? null,
        durationSec: parsed.durationSec ?? null,
        distanceM: parsed.distanceM ?? null,
        avgHr: parsed.avgHr ?? null,
        maxHr: parsed.maxHr ?? null,
        calories: parsed.calories ?? null,
        trainingLoad: parsed.trainingLoad ?? null,
        rpe: parsed.rpe ?? null,
        feel: parsed.feel ?? null,
        notes: parsed.notes ?? null,
        coachNotes: parsed.coachNotes ?? null,
        effortDistanceM: parsed.effortDistanceM ?? null,
        timeOfDay: parsed.timeOfDay ?? null,
        terrain: parsed.terrain ?? null,
        weather: parsed.weather ?? null,
        extraMetrics: parsed.extraMetrics ?? existing.extraMetrics,
        screenshotPaths: parsed.screenshotPaths ?? existing.screenshotPaths,
        updatedAt: new Date(),
      })
      .where(eq(activities.id, activityId));

    // Replace run_metrics for sport='run' — delete + insert.
    await tx.delete(runMetrics).where(eq(runMetrics.activityId, activityId));
    if (parsed.sport === "run" && parsed.run) {
      await tx.insert(runMetrics).values({
        activityId,
        userId,
        avgPaceSecPerKm: parsed.run.avgPaceSecPerKm ?? null,
        cadenceSpm: parsed.run.cadenceSpm ?? null,
        strideLengthM: toNumericString(parsed.run.strideLengthM),
        gctAvgMs: parsed.run.gctAvgMs ?? null,
        gctMinMs: parsed.run.gctMinMs ?? null,
        balanceLeftPct: toNumericString(parsed.run.balanceLeftPct),
        balanceRightPct: toNumericString(parsed.run.balanceRightPct),
        vo2max: toNumericString(parsed.run.vo2max),
        elevationGainM: parsed.run.elevationGainM ?? null,
      });
    }

    // Replace items + sets — delete cascade handles sets.
    await tx
      .delete(activityItems)
      .where(and(eq(activityItems.userId, userId), eq(activityItems.activityId, activityId)));
    for (const item of parsed.items) {
      const [ai] = await tx
        .insert(activityItems)
        .values({
          userId,
          activityId,
          plannedItemId: item.plannedItemId ?? null,
          blockName: item.blockName ?? null,
          position: item.position,
          name: item.name,
          notes: item.notes ?? null,
        })
        .returning();
      if (item.sets.length > 0) {
        await tx.insert(activitySets).values(
          item.sets.map((s) => ({
            userId,
            itemId: ai.id,
            setNumber: s.setNumber,
            reps: s.reps ?? null,
            durationSec: s.durationSec ?? null,
            distanceM: s.distanceM ?? null,
            loadKg: toNumericString(s.loadKg ?? null),
            status: s.status,
            notes: s.notes ?? null,
          })),
        );
      }
    }

    return { id: activityId };
  });
}

export async function getActivity(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.userId, userId), eq(activities.id, id)))
    .limit(1);
  return row ?? null;
}

export async function listActivities(
  userId: string,
  opts: { limit?: number; sport?: string } = {},
) {
  const conditions = [eq(activities.userId, userId)];
  if (opts.sport) {
    conditions.push(eq(activities.sport, opts.sport as (typeof activities.$inferSelect)["sport"]));
  }
  const query = db
    .select()
    .from(activities)
    .where(and(...conditions))
    .orderBy(desc(activities.date));
  return opts.limit ? query.limit(opts.limit) : query;
}

export type HydratedActivity = {
  activity: typeof activities.$inferSelect;
  runMetrics: typeof runMetrics.$inferSelect | null;
  items: Array<{
    item: typeof activityItems.$inferSelect;
    sets: Array<typeof activitySets.$inferSelect>;
  }>;
};

export async function getHydratedActivity(
  userId: string,
  id: string,
): Promise<HydratedActivity | null> {
  const [activity] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.userId, userId), eq(activities.id, id)))
    .limit(1);
  if (!activity) return null;

  const [rm] = await db
    .select()
    .from(runMetrics)
    .where(and(eq(runMetrics.userId, userId), eq(runMetrics.activityId, id)))
    .limit(1);

  const items = await db
    .select()
    .from(activityItems)
    .where(and(eq(activityItems.userId, userId), eq(activityItems.activityId, id)))
    .orderBy(activityItems.position);

  const itemIds = items.map((i) => i.id);
  const sets =
    itemIds.length === 0
      ? []
      : await db
          .select()
          .from(activitySets)
          .where(and(eq(activitySets.userId, userId), inArray(activitySets.itemId, itemIds)))
          .orderBy(activitySets.setNumber);

  const setsByItem = new Map<string, Array<typeof activitySets.$inferSelect>>();
  for (const s of sets) {
    if (!setsByItem.has(s.itemId)) setsByItem.set(s.itemId, []);
    setsByItem.get(s.itemId)!.push(s);
  }

  return {
    activity,
    runMetrics: rm ?? null,
    items: items.map((item) => ({ item, sets: setsByItem.get(item.id) ?? [] })),
  };
}

export async function deleteActivity(userId: string, id: string) {
  const [row] = await db
    .delete(activities)
    .where(and(eq(activities.userId, userId), eq(activities.id, id)))
    .returning({ id: activities.id });
  if (!row) throw new ServiceError("NOT_FOUND", "Activity not found");
  return row;
}

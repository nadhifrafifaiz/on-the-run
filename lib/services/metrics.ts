import { and, desc, eq, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { athleteMetricsHistory } from "@/db/schema";
import { athleteMetricsInputZ, type AthleteMetricsInput } from "@/lib/schemas/forms";

// Metric row effective at a given date (latest row with effective_from <= date).
export async function metricsAt(userId: string, date: string) {
  const [row] = await db
    .select()
    .from(athleteMetricsHistory)
    .where(
      and(eq(athleteMetricsHistory.userId, userId), lte(athleteMetricsHistory.effectiveFrom, date)),
    )
    .orderBy(desc(athleteMetricsHistory.effectiveFrom))
    .limit(1);
  return row ?? null;
}

// Snapshot payload frozen onto activities.zone_snapshot.
export type ZoneSnapshot = {
  effective_from: string;
  max_hr: number | null;
  resting_hr: number | null;
  lthr: number | null;
  hr_zones: unknown | null;
  target_cadence_spm: number | null;
};

export async function zoneSnapshotAt(userId: string, date: string): Promise<ZoneSnapshot | null> {
  const m = await metricsAt(userId, date);
  if (!m) return null;
  return {
    effective_from: m.effectiveFrom,
    max_hr: m.maxHr,
    resting_hr: m.restingHr,
    lthr: m.lthr,
    hr_zones: m.hrZones ?? null,
    target_cadence_spm: m.targetCadenceSpm,
  };
}

export async function addMetricsHistory(userId: string, input: AthleteMetricsInput) {
  const parsed = athleteMetricsInputZ.parse(input);
  const [row] = await db
    .insert(athleteMetricsHistory)
    .values({
      userId,
      effectiveFrom: parsed.effectiveFrom,
      maxHr: parsed.maxHr,
      restingHr: parsed.restingHr,
      lthr: parsed.lthr,
      hrZones: parsed.hrZones ?? null,
      vo2max: parsed.vo2max?.toString() ?? null,
      targetCadenceSpm: parsed.targetCadenceSpm,
      notes: parsed.notes,
    })
    .onConflictDoUpdate({
      target: [athleteMetricsHistory.userId, athleteMetricsHistory.effectiveFrom],
      set: {
        maxHr: parsed.maxHr,
        restingHr: parsed.restingHr,
        lthr: parsed.lthr,
        hrZones: parsed.hrZones ?? null,
        vo2max: parsed.vo2max?.toString() ?? null,
        targetCadenceSpm: parsed.targetCadenceSpm,
        notes: parsed.notes,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}

export async function listMetricsHistory(userId: string) {
  return db
    .select()
    .from(athleteMetricsHistory)
    .where(eq(athleteMetricsHistory.userId, userId))
    .orderBy(desc(athleteMetricsHistory.effectiveFrom));
}

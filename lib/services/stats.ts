import { and, between, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "@/db/client";
import {
  activities,
  activitySets,
  activityItems,
  plannedBlocks,
  plannedItems,
  plannedSessions,
  programs,
  races,
} from "@/db/schema";
import { addDays } from "@/lib/utils/dates";

// Only show sessions from active programs OR orphan sessions (no program).
// Sessions from archived/completed/draft programs are hidden — user can still
// see them via /programs/[id].
const visibleSessionFilter = or(
  isNull(plannedSessions.programId),
  eq(programs.status, "active"),
)!;

// Sessions for a date range, each with its (optional) program name and linked activity id.
export async function daySessions(userId: string, from: string, to: string) {
  const rows = await db
    .select({
      session: plannedSessions,
      programName: programs.name,
    })
    .from(plannedSessions)
    .leftJoin(programs, eq(programs.id, plannedSessions.programId))
    .where(
      and(
        eq(plannedSessions.userId, userId),
        between(plannedSessions.date, from, to),
        visibleSessionFilter,
      ),
    )
    .orderBy(plannedSessions.date, plannedSessions.position);
  return rows;
}

export type HydratedSession = {
  session: typeof plannedSessions.$inferSelect;
  programName: string | null;
  blocks: Array<{
    block: typeof plannedBlocks.$inferSelect;
    items: Array<typeof plannedItems.$inferSelect>;
  }>;
};

// Sessions + blocks + items for a date range, batched in 3 queries.
export async function hydratedSessions(
  userId: string,
  from: string,
  to: string,
): Promise<HydratedSession[]> {
  const sessionRows = await daySessions(userId, from, to);
  if (sessionRows.length === 0) return [];
  const sessionIds = sessionRows.map((r) => r.session.id);

  const blockRows = await db
    .select()
    .from(plannedBlocks)
    .where(
      and(eq(plannedBlocks.userId, userId), inArray(plannedBlocks.sessionId, sessionIds)),
    )
    .orderBy(plannedBlocks.position);

  const blockIds = blockRows.map((b) => b.id);
  const itemRows =
    blockIds.length === 0
      ? []
      : await db
          .select()
          .from(plannedItems)
          .where(
            and(eq(plannedItems.userId, userId), inArray(plannedItems.blockId, blockIds)),
          )
          .orderBy(plannedItems.position);

  const itemsByBlock = new Map<string, Array<typeof plannedItems.$inferSelect>>();
  for (const item of itemRows) {
    if (!itemsByBlock.has(item.blockId)) itemsByBlock.set(item.blockId, []);
    itemsByBlock.get(item.blockId)!.push(item);
  }

  const blocksBySession = new Map<
    string,
    Array<{ block: typeof plannedBlocks.$inferSelect; items: Array<typeof plannedItems.$inferSelect> }>
  >();
  for (const block of blockRows) {
    if (!blocksBySession.has(block.sessionId)) blocksBySession.set(block.sessionId, []);
    blocksBySession.get(block.sessionId)!.push({
      block,
      items: itemsByBlock.get(block.id) ?? [],
    });
  }

  return sessionRows.map((r) => ({
    session: r.session,
    programName: r.programName,
    blocks: blocksBySession.get(r.session.id) ?? [],
  }));
}

// All hydrated sessions for a program (regardless of date), ordered by date.
export async function hydratedSessionsForProgram(
  userId: string,
  programId: string,
): Promise<HydratedSession[]> {
  const sessionRows = await db
    .select({ session: plannedSessions, programName: programs.name })
    .from(plannedSessions)
    .leftJoin(programs, eq(programs.id, plannedSessions.programId))
    .where(and(eq(plannedSessions.userId, userId), eq(plannedSessions.programId, programId)))
    .orderBy(plannedSessions.date, plannedSessions.position);
  if (sessionRows.length === 0) return [];
  const sessionIds = sessionRows.map((r) => r.session.id);

  const blockRows = await db
    .select()
    .from(plannedBlocks)
    .where(
      and(eq(plannedBlocks.userId, userId), inArray(plannedBlocks.sessionId, sessionIds)),
    )
    .orderBy(plannedBlocks.position);

  const blockIds = blockRows.map((b) => b.id);
  const itemRows =
    blockIds.length === 0
      ? []
      : await db
          .select()
          .from(plannedItems)
          .where(and(eq(plannedItems.userId, userId), inArray(plannedItems.blockId, blockIds)))
          .orderBy(plannedItems.position);

  const itemsByBlock = new Map<string, Array<typeof plannedItems.$inferSelect>>();
  for (const item of itemRows) {
    if (!itemsByBlock.has(item.blockId)) itemsByBlock.set(item.blockId, []);
    itemsByBlock.get(item.blockId)!.push(item);
  }
  const blocksBySession = new Map<
    string,
    Array<{ block: typeof plannedBlocks.$inferSelect; items: Array<typeof plannedItems.$inferSelect> }>
  >();
  for (const block of blockRows) {
    if (!blocksBySession.has(block.sessionId)) blocksBySession.set(block.sessionId, []);
    blocksBySession.get(block.sessionId)!.push({
      block,
      items: itemsByBlock.get(block.id) ?? [],
    });
  }
  return sessionRows.map((r) => ({
    session: r.session,
    programName: r.programName,
    blocks: blocksBySession.get(r.session.id) ?? [],
  }));
}

// Activities in a date range, indexed by date for quick weekly overlays.
export async function activitiesByDate(userId: string, from: string, to: string) {
  const rows = await db
    .select()
    .from(activities)
    .where(and(eq(activities.userId, userId), between(activities.date, from, to)))
    .orderBy(activities.date);
  const byDate = new Map<string, Array<typeof activities.$inferSelect>>();
  for (const a of rows) {
    if (!byDate.has(a.date)) byDate.set(a.date, []);
    byDate.get(a.date)!.push(a);
  }
  return byDate;
}

export type WeeklySummary = {
  weekStart: string;
  runDistanceKm: number;
  totalDurationMin: number;
  sessionsPlanned: number;
  sessionsDone: number;
  avgRpe: number | null;
};

export async function weeklySummary(userId: string, weekStart: string): Promise<WeeklySummary> {
  const weekEnd = addDays(weekStart, 6);
  const [sessions, acts] = await Promise.all([
    db
      .select({
        status: plannedSessions.status,
      })
      .from(plannedSessions)
      .leftJoin(programs, eq(programs.id, plannedSessions.programId))
      .where(
        and(
          eq(plannedSessions.userId, userId),
          between(plannedSessions.date, weekStart, weekEnd),
          visibleSessionFilter,
        ),
      ),
    db
      .select()
      .from(activities)
      .where(and(eq(activities.userId, userId), between(activities.date, weekStart, weekEnd))),
  ]);

  const runDistanceM = acts
    .filter((a) => a.sport === "run")
    .reduce((sum, a) => sum + (a.distanceM ?? 0), 0);
  const totalDurationSec = acts.reduce((sum, a) => sum + (a.durationSec ?? 0), 0);
  const rpes = acts.map((a) => a.rpe).filter((r): r is number => r !== null);
  const avgRpe =
    rpes.length > 0 ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10 : null;

  return {
    weekStart,
    runDistanceKm: Math.round((runDistanceM / 1000) * 10) / 10,
    totalDurationMin: Math.round(totalDurationSec / 60),
    sessionsPlanned: sessions.length,
    sessionsDone: sessions.filter((s) => s.status === "done").length,
    avgRpe,
  };
}

export type BestEffort = {
  distanceM: number;
  distanceLabel: "5K" | "10K" | "HM" | "FM";
  timeSec: number;
  source: "race" | "activity";
  sourceId: string;
  date: string;
};

const STANDARD_DISTANCES: Array<{ label: BestEffort["distanceLabel"]; m: number }> = [
  { label: "5K", m: 5000 },
  { label: "10K", m: 10000 },
  { label: "HM", m: 21097 },
  { label: "FM", m: 42195 },
];

// PR per standard distance. Prefer race chip time; fall back to activity.effort_distance_m.
export async function bestEfforts(userId: string): Promise<BestEffort[]> {
  const [raceRows, effortRows] = await Promise.all([
    db
      .select({
        id: races.id,
        distanceM: races.distanceM,
        distanceLabel: races.distanceLabel,
        chipTimeSec: races.chipTimeSec,
        date: races.date,
      })
      .from(races)
      .where(and(eq(races.userId, userId), isNotNull(races.chipTimeSec))),
    db
      .select({
        id: activities.id,
        effortDistanceM: activities.effortDistanceM,
        durationSec: activities.durationSec,
        date: activities.date,
      })
      .from(activities)
      .where(
        and(
          eq(activities.userId, userId),
          isNotNull(activities.effortDistanceM),
          isNotNull(activities.durationSec),
        ),
      ),
  ]);

  const out: BestEffort[] = [];
  for (const { label, m } of STANDARD_DISTANCES) {
    const raceCandidates = raceRows
      .filter((r) => r.distanceM === m || r.distanceLabel === label)
      .map((r) => ({
        distanceM: m,
        distanceLabel: label,
        timeSec: r.chipTimeSec as number,
        source: "race" as const,
        sourceId: r.id,
        date: r.date,
      }));
    const activityCandidates = effortRows
      .filter((a) => a.effortDistanceM === m)
      .map((a) => ({
        distanceM: m,
        distanceLabel: label,
        timeSec: a.durationSec as number,
        source: "activity" as const,
        sourceId: a.id,
        date: a.date,
      }));
    const all = [...raceCandidates, ...activityCandidates];
    if (all.length === 0) continue;
    all.sort((a, b) => a.timeSec - b.timeSec);
    out.push(all[0]);
  }
  return out;
}

// Percent of sets matching plan, and count of failed sets.
export async function sessionCompliance(userId: string, sessionId: string) {
  const [session] = await db
    .select({ id: plannedSessions.id, activityId: plannedSessions.activityId })
    .from(plannedSessions)
    .where(and(eq(plannedSessions.userId, userId), eq(plannedSessions.id, sessionId)))
    .limit(1);
  if (!session || !session.activityId) {
    return { totalSets: 0, matchingSets: 0, failedSets: 0, percentMatch: 0 };
  }
  const items = await db
    .select({
      itemId: activityItems.id,
      plannedItemId: activityItems.plannedItemId,
    })
    .from(activityItems)
    .where(and(eq(activityItems.userId, userId), eq(activityItems.activityId, session.activityId)));
  if (items.length === 0)
    return { totalSets: 0, matchingSets: 0, failedSets: 0, percentMatch: 0 };

  const sets = await db
    .select()
    .from(activitySets)
    .where(
      and(
        eq(activitySets.userId, userId),
        or(...items.map((i) => eq(activitySets.itemId, i.itemId)))!,
      ),
    );

  const failedSets = sets.filter((s) => s.status === "failed").length;
  const matchingSets = sets.filter((s) => s.status === "done").length;
  const totalSets = sets.length;
  const percentMatch = totalSets === 0 ? 0 : Math.round((matchingSets / totalSets) * 100);
  return { totalSets, matchingSets, failedSets, percentMatch };
}

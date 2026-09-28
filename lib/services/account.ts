import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  activities,
  activityDrafts,
  activityItems,
  activitySets,
  athleteMetricsHistory,
  dailyNotes,
  plannedBlocks,
  plannedItems,
  plannedSessions,
  profiles,
  programPhases,
  programs,
  races,
  runMetrics,
  weekNotes,
} from "@/db/schema";

// Delete every row we own for this user. Cascades will handle child rows,
// but we delete leaves first for clarity + to avoid depending on FK order.
// Note: this does NOT delete auth.users — that is done via Supabase Admin API
// in a separate step (server action / API route).
export async function deleteAllUserData(userId: string) {
  return db.transaction(async (tx) => {
    await tx.delete(activitySets).where(eq(activitySets.userId, userId));
    await tx.delete(activityItems).where(eq(activityItems.userId, userId));
    await tx.delete(runMetrics).where(eq(runMetrics.userId, userId));
    await tx.delete(activityDrafts).where(eq(activityDrafts.userId, userId));
    await tx.delete(activities).where(eq(activities.userId, userId));
    await tx.delete(plannedItems).where(eq(plannedItems.userId, userId));
    await tx.delete(plannedBlocks).where(eq(plannedBlocks.userId, userId));
    await tx.delete(plannedSessions).where(eq(plannedSessions.userId, userId));
    await tx.delete(programPhases).where(eq(programPhases.userId, userId));
    await tx.delete(programs).where(eq(programs.userId, userId));
    await tx.delete(races).where(eq(races.userId, userId));
    await tx.delete(weekNotes).where(eq(weekNotes.userId, userId));
    await tx.delete(dailyNotes).where(eq(dailyNotes.userId, userId));
    await tx.delete(athleteMetricsHistory).where(eq(athleteMetricsHistory.userId, userId));
    await tx.delete(profiles).where(eq(profiles.userId, userId));
  });
}

import { userIdFromRequest } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/response";
import {
  activitiesByDate,
  hydratedSessions,
  weeklySummary,
} from "@/lib/services/stats";
import { getProfile } from "@/lib/services/profiles";
import { todayInTz, weekStartOf } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const userId = await userIdFromRequest(req);
  if (!userId) return fail(401, "UNAUTHORIZED", "Token tidak valid");

  const profile = await getProfile(userId);
  const weekStart = (profile?.weekStart ?? "monday") as "monday" | "sunday";
  const today = todayInTz(profile?.timezone ?? "Asia/Jakarta");
  const monday = weekStartOf(today, weekStart);

  const [sessions, activitiesMap, week] = await Promise.all([
    hydratedSessions(userId, today, today),
    activitiesByDate(userId, today, today),
    weeklySummary(userId, monday),
  ]);
  const todaysActivities = activitiesMap.get(today) ?? [];

  return ok({
    date: today,
    week: {
      start: monday,
      sessionsDone: week.sessionsDone,
      sessionsPlanned: week.sessionsPlanned,
      runDistanceKm: week.runDistanceKm,
      totalDurationMin: week.totalDurationMin,
      avgRpe: week.avgRpe,
    },
    todaySessions: sessions.map(({ session, programName, blocks }) => ({
      id: session.id,
      sport: session.sport,
      sessionType: session.sessionType,
      title: session.title,
      description: session.description,
      status: session.status,
      programName,
      targetDurationMinSec: session.targetDurationMinSec,
      targetDurationMaxSec: session.targetDurationMaxSec,
      targetDistanceM: session.targetDistanceM,
      targetIntensity: session.targetIntensity,
      blocks: blocks.map(({ block, items }) => ({
        name: block.name,
        rounds: block.rounds,
        items: items.map((it) => ({
          name: it.name,
          sets: it.sets,
          reps: it.reps,
          durationSec: it.durationSec,
          distanceM: it.distanceM,
          loadKg: it.loadKg,
          target: it.target,
        })),
      })),
    })),
    todayActivities: todaysActivities.map((a) => ({
      id: a.id,
      sport: a.sport,
      title: a.title,
      durationSec: a.durationSec,
      distanceM: a.distanceM,
      avgHr: a.avgHr,
      rpe: a.rpe,
      feel: a.feel,
    })),
  });
}

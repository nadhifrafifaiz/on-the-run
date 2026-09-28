import { userIdFromRequest } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/response";
import { hydratedSessions, weeklySummary } from "@/lib/services/stats";
import { getProfile } from "@/lib/services/profiles";
import { addDays, toIsoDate, weekStartOf } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const userId = await userIdFromRequest(req);
  if (!userId) return fail(401, "UNAUTHORIZED", "Token tidak valid");

  const profile = await getProfile(userId);
  const weekStart = (profile?.weekStart ?? "monday") as "monday" | "sunday";
  const today = toIsoDate(new Date());
  const start = weekStartOf(today, weekStart);
  const end = addDays(start, 6);

  const [summary, sessions] = await Promise.all([
    weeklySummary(userId, start),
    hydratedSessions(userId, start, end),
  ]);

  return ok({
    weekStart: start,
    weekEnd: end,
    summary: {
      sessionsDone: summary.sessionsDone,
      sessionsPlanned: summary.sessionsPlanned,
      runDistanceKm: summary.runDistanceKm,
      totalDurationMin: summary.totalDurationMin,
      avgRpe: summary.avgRpe,
    },
    sessions: sessions.map(({ session, programName }) => ({
      id: session.id,
      date: session.date,
      sport: session.sport,
      sessionType: session.sessionType,
      title: session.title,
      status: session.status,
      programName,
      targetDistanceM: session.targetDistanceM,
      targetDurationMinSec: session.targetDurationMinSec,
      targetDurationMaxSec: session.targetDurationMaxSec,
    })),
  });
}

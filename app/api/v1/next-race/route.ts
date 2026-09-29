import { userIdFromRequest } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/response";
import { getProfile } from "@/lib/services/profiles";
import { upcomingRaces } from "@/lib/services/races";
import { daysBetween, todayInTz } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const userId = await userIdFromRequest(req);
  if (!userId) return fail(401, "UNAUTHORIZED", "Token tidak valid");

  const profile = await getProfile(userId);
  const today = todayInTz(profile?.timezone ?? "Asia/Jakarta");
  const upcoming = await upcomingRaces(userId, today);
  const race = upcoming[0] ?? null;

  return ok({
    today,
    race: race
      ? {
          id: race.id,
          name: race.name,
          date: race.date,
          location: race.location,
          distanceM: race.distanceM,
          distanceLabel: race.distanceLabel,
          targetTimeSec: race.targetTimeSec,
          daysToRace: daysBetween(today, race.date),
        }
      : null,
  });
}

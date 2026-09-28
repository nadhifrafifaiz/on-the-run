import { and, asc, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { races } from "@/db/schema";
import { ServiceError } from "@/lib/utils/errors";
import { isoDateZ, raceStatusZ, distanceLabelZ } from "@/lib/schemas/enums";
import { z } from "zod";

const raceInputZ = z.object({
  name: z.string().min(1),
  date: isoDateZ,
  location: z.string().nullable().optional(),
  distanceM: z.number().int().positive().nullable().optional(),
  distanceLabel: distanceLabelZ.nullable().optional(),
  status: raceStatusZ.default("planned"),
  targetTimeSec: z.number().int().positive().nullable().optional(),
  strategy: z.string().nullable().optional(),
  chipTimeSec: z.number().int().positive().nullable().optional(),
  watchTimeSec: z.number().int().positive().nullable().optional(),
  rankOverall: z.number().int().positive().nullable().optional(),
  totalOverall: z.number().int().positive().nullable().optional(),
  rankGender: z.number().int().positive().nullable().optional(),
  totalGender: z.number().int().positive().nullable().optional(),
  rankCategory: z.number().int().positive().nullable().optional(),
  totalCategory: z.number().int().positive().nullable().optional(),
  report: z.string().nullable().optional(),
  activityId: z.string().uuid().nullable().optional(),
});
export type RaceInput = z.input<typeof raceInputZ>;

export async function listRaces(userId: string) {
  return db.select().from(races).where(eq(races.userId, userId)).orderBy(desc(races.date));
}

export async function upcomingRaces(userId: string, today: string) {
  return db
    .select()
    .from(races)
    .where(and(eq(races.userId, userId), gte(races.date, today)))
    .orderBy(asc(races.date));
}

export async function getRace(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(races)
    .where(and(eq(races.userId, userId), eq(races.id, id)))
    .limit(1);
  return row ?? null;
}

export async function createRace(userId: string, input: RaceInput) {
  const parsed = raceInputZ.parse(input);
  const [row] = await db
    .insert(races)
    .values({ userId, ...parsed })
    .returning();
  return row;
}

export async function updateRace(userId: string, id: string, input: Partial<RaceInput>) {
  const [row] = await db
    .update(races)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(races.userId, userId), eq(races.id, id)))
    .returning();
  if (!row) throw new ServiceError("NOT_FOUND", "Race not found");
  return row;
}

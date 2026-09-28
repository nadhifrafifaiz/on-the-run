import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles } from "@/db/schema";
import { profileInputZ, type ProfileInput } from "@/lib/schemas/forms";

export async function getProfile(userId: string) {
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return row ?? null;
}

export async function upsertProfile(userId: string, input: ProfileInput) {
  const parsed = profileInputZ.parse(input);
  const [row] = await db
    .insert(profiles)
    .values({ userId, ...parsed })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { ...parsed, updatedAt: new Date() },
    })
    .returning();
  return row;
}

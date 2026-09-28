import { and, desc, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { activityDrafts } from "@/db/schema";
import { ServiceError } from "@/lib/utils/errors";
import { sourceZ } from "@/lib/schemas/enums";
import type { z } from "zod";

export async function listPending(userId: string) {
  return db
    .select()
    .from(activityDrafts)
    .where(
      and(
        eq(activityDrafts.userId, userId),
        eq(activityDrafts.status, "pending"),
        gt(activityDrafts.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(activityDrafts.createdAt));
}

export async function getDraft(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(activityDrafts)
    .where(and(eq(activityDrafts.userId, userId), eq(activityDrafts.id, id)))
    .limit(1);
  return row ?? null;
}

export async function createDraft(
  userId: string,
  source: z.infer<typeof sourceZ>,
  payload: unknown,
) {
  const [row] = await db
    .insert(activityDrafts)
    .values({ userId, source, payload: payload as object })
    .returning();
  return row;
}

export async function discardDraft(userId: string, id: string) {
  const [row] = await db
    .update(activityDrafts)
    .set({ status: "discarded", updatedAt: new Date() })
    .where(and(eq(activityDrafts.userId, userId), eq(activityDrafts.id, id)))
    .returning({ id: activityDrafts.id });
  if (!row) throw new ServiceError("NOT_FOUND", "Draft not found");
  return row;
}

// Used by the daily cron; can be called with a specific userId scope for tests.
export async function purgeExpired(scope: { userId?: string } = {}) {
  const conditions = [eq(activityDrafts.status, "pending"), lt(activityDrafts.expiresAt, new Date())];
  if (scope.userId) conditions.unshift(eq(activityDrafts.userId, scope.userId));
  return db
    .delete(activityDrafts)
    .where(and(...conditions))
    .returning({ id: activityDrafts.id });
}

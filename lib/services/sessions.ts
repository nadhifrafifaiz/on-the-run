import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { plannedBlocks, plannedItems, plannedSessions } from "@/db/schema";
import { ServiceError } from "@/lib/utils/errors";
import {
  plannedSessionInputZ,
  type PlannedSessionInput,
} from "@/lib/schemas/forms";
import { sessionStatusZ } from "@/lib/schemas/enums";
import type { z } from "zod";

export async function getSession(userId: string, id: string) {
  const [session] = await db
    .select()
    .from(plannedSessions)
    .where(and(eq(plannedSessions.userId, userId), eq(plannedSessions.id, id)))
    .limit(1);
  if (!session) return null;
  const blocks = await db
    .select()
    .from(plannedBlocks)
    .where(and(eq(plannedBlocks.userId, userId), eq(plannedBlocks.sessionId, id)));
  const blockIds = blocks.map((b) => b.id);
  const items =
    blockIds.length > 0
      ? await db
          .select()
          .from(plannedItems)
          .where(eq(plannedItems.userId, userId))
      : [];
  return {
    session,
    blocks: blocks.map((b) => ({
      ...b,
      items: items.filter((i) => i.blockId === b.id).sort((a, b) => a.position - b.position),
    })),
  };
}

export async function createSession(userId: string, input: PlannedSessionInput) {
  const parsed = plannedSessionInputZ.parse(input);
  return db.transaction(async (tx) => {
    const [session] = await tx
      .insert(plannedSessions)
      .values({
        userId,
        date: parsed.date,
        programId: parsed.programId ?? null,
        position: parsed.position,
        sport: parsed.sport,
        sessionType: parsed.sessionType ?? null,
        title: parsed.title ?? null,
        description: parsed.description ?? null,
        targetDurationMinSec: parsed.targetDurationMinSec ?? null,
        targetDurationMaxSec: parsed.targetDurationMaxSec ?? null,
        targetDistanceM: parsed.targetDistanceM ?? null,
        targetIntensity: parsed.targetIntensity ?? null,
        status: parsed.status,
      })
      .returning();
    for (const block of parsed.blocks) {
      const [b] = await tx
        .insert(plannedBlocks)
        .values({
          userId,
          sessionId: session.id,
          position: block.position,
          name: block.name,
          rounds: block.rounds,
          notes: block.notes,
        })
        .returning();
      if (block.items.length > 0) {
        await tx.insert(plannedItems).values(
          block.items.map((item) => ({
            userId,
            blockId: b.id,
            position: item.position,
            name: item.name,
            sets: item.sets ?? null,
            reps: item.reps ?? null,
            durationSec: item.durationSec ?? null,
            distanceM: item.distanceM ?? null,
            loadKg: item.loadKg?.toString() ?? null,
            restSec: item.restSec ?? null,
            target: item.target ?? null,
            notes: item.notes ?? null,
          })),
        );
      }
    }
    return session;
  });
}

// Update fields on a planned session. Does NOT touch blocks/items (those
// get edited via separate endpoints later; keep this simple for now).
export async function updateSession(
  userId: string,
  id: string,
  input: Partial<PlannedSessionInput>,
) {
  const [row] = await db
    .update(plannedSessions)
    .set({
      ...(input.date !== undefined && { date: input.date }),
      ...(input.programId !== undefined && { programId: input.programId ?? null }),
      ...(input.sport !== undefined && { sport: input.sport }),
      ...(input.sessionType !== undefined && { sessionType: input.sessionType ?? null }),
      ...(input.title !== undefined && { title: input.title ?? null }),
      ...(input.description !== undefined && { description: input.description ?? null }),
      ...(input.targetDurationMinSec !== undefined && {
        targetDurationMinSec: input.targetDurationMinSec ?? null,
      }),
      ...(input.targetDurationMaxSec !== undefined && {
        targetDurationMaxSec: input.targetDurationMaxSec ?? null,
      }),
      ...(input.targetDistanceM !== undefined && {
        targetDistanceM: input.targetDistanceM ?? null,
      }),
      ...(input.targetIntensity !== undefined && {
        targetIntensity: input.targetIntensity ?? null,
      }),
      ...(input.status !== undefined && { status: input.status }),
      updatedAt: new Date(),
    })
    .where(and(eq(plannedSessions.userId, userId), eq(plannedSessions.id, id)))
    .returning();
  if (!row) throw new ServiceError("NOT_FOUND", "Session not found");
  return row;
}

export async function markSession(
  userId: string,
  id: string,
  status: z.infer<typeof sessionStatusZ>,
  note?: string,
) {
  const parsed = sessionStatusZ.parse(status);
  const [row] = await db
    .update(plannedSessions)
    .set({ status: parsed, statusNote: note ?? null, updatedAt: new Date() })
    .where(and(eq(plannedSessions.userId, userId), eq(plannedSessions.id, id)))
    .returning();
  if (!row) throw new ServiceError("NOT_FOUND", "Session not found");
  return row;
}

// Replace all blocks + items for a session (transactional).
// Use for edit flow — simpler + safer than diffing. Preserves session row itself.
export async function replaceSessionBlocks(
  userId: string,
  sessionId: string,
  blocksInput: PlannedSessionInput["blocks"],
) {
  const blocks = blocksInput ?? [];
  return db.transaction(async (tx) => {
    // Verify session ownership.
    const [session] = await tx
      .select({ id: plannedSessions.id })
      .from(plannedSessions)
      .where(and(eq(plannedSessions.userId, userId), eq(plannedSessions.id, sessionId)))
      .limit(1);
    if (!session) throw new ServiceError("NOT_FOUND", "Session not found");

    // Fetch existing blocks so we can cascade delete their items too.
    const existing = await tx
      .select({ id: plannedBlocks.id })
      .from(plannedBlocks)
      .where(
        and(eq(plannedBlocks.userId, userId), eq(plannedBlocks.sessionId, sessionId)),
      );
    for (const b of existing) {
      await tx.delete(plannedItems).where(eq(plannedItems.blockId, b.id));
    }
    await tx.delete(plannedBlocks).where(eq(plannedBlocks.sessionId, sessionId));

    // Insert fresh blocks + items.
    for (const [bi, block] of blocks.entries()) {
      const items = block.items ?? [];
      const [b] = await tx
        .insert(plannedBlocks)
        .values({
          userId,
          sessionId,
          position: block.position ?? bi,
          name: block.name,
          rounds: block.rounds,
          notes: block.notes,
        })
        .returning({ id: plannedBlocks.id });
      if (items.length > 0) {
        await tx.insert(plannedItems).values(
          items.map((item, ii) => ({
            userId,
            blockId: b.id,
            position: item.position ?? ii,
            name: item.name,
            sets: item.sets ?? null,
            reps: item.reps ?? null,
            durationSec: item.durationSec ?? null,
            distanceM: item.distanceM ?? null,
            loadKg: item.loadKg?.toString() ?? null,
            restSec: item.restSec ?? null,
            target: item.target ?? null,
            notes: item.notes ?? null,
          })),
        );
      }
    }
  });
}

// Copy a session (blocks + items) to a target date. Status reset to planned.
// Returns the new session id.
export async function duplicateSession(
  userId: string,
  sourceId: string,
  targetDate: string,
): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    // Load source session + blocks + items.
    const [src] = await tx
      .select()
      .from(plannedSessions)
      .where(and(eq(plannedSessions.userId, userId), eq(plannedSessions.id, sourceId)))
      .limit(1);
    if (!src) throw new ServiceError("NOT_FOUND", "Source session not found");

    const srcBlocks = await tx
      .select()
      .from(plannedBlocks)
      .where(
        and(eq(plannedBlocks.userId, userId), eq(plannedBlocks.sessionId, sourceId)),
      );

    // Insert new session as planned (never carry activity_id or status).
    const [newSession] = await tx
      .insert(plannedSessions)
      .values({
        userId,
        date: targetDate,
        programId: src.programId,
        position: src.position,
        sport: src.sport,
        sessionType: src.sessionType,
        title: src.title,
        description: src.description,
        targetDurationMinSec: src.targetDurationMinSec,
        targetDurationMaxSec: src.targetDurationMaxSec,
        targetDistanceM: src.targetDistanceM,
        targetIntensity: src.targetIntensity,
        status: "planned",
      })
      .returning({ id: plannedSessions.id });

    for (const block of srcBlocks) {
      const [newBlock] = await tx
        .insert(plannedBlocks)
        .values({
          userId,
          sessionId: newSession.id,
          position: block.position,
          name: block.name,
          rounds: block.rounds,
          notes: block.notes,
        })
        .returning({ id: plannedBlocks.id });

      const srcItems = await tx
        .select()
        .from(plannedItems)
        .where(and(eq(plannedItems.userId, userId), eq(plannedItems.blockId, block.id)));
      if (srcItems.length > 0) {
        await tx.insert(plannedItems).values(
          srcItems.map((i) => ({
            userId,
            blockId: newBlock.id,
            position: i.position,
            name: i.name,
            sets: i.sets,
            reps: i.reps,
            durationSec: i.durationSec,
            distanceM: i.distanceM,
            loadKg: i.loadKg,
            restSec: i.restSec,
            target: i.target,
            notes: i.notes,
          })),
        );
      }
    }

    return { id: newSession.id };
  });
}

// Delete only if no activity is linked. Session with activityId is locked.
export async function deleteSession(userId: string, id: string) {
  const [existing] = await db
    .select({ id: plannedSessions.id, activityId: plannedSessions.activityId })
    .from(plannedSessions)
    .where(and(eq(plannedSessions.userId, userId), eq(plannedSessions.id, id)))
    .limit(1);
  if (!existing) throw new ServiceError("NOT_FOUND", "Session not found");
  if (existing.activityId) {
    throw new ServiceError(
      "CONFLICT",
      "Sesi terkunci: sudah punya aktivitas tertaut. Hapus aktivitasnya dulu jika perlu.",
    );
  }
  await db
    .delete(plannedSessions)
    .where(and(eq(plannedSessions.userId, userId), eq(plannedSessions.id, id)));
}

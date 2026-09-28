import { and, asc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { programPhases } from "@/db/schema";
import { ServiceError } from "@/lib/utils/errors";
import { isoDateZ } from "@/lib/schemas/enums";

export const phaseInputZ = z.object({
  programId: z.string().uuid(),
  name: z.string().min(1).max(80),
  startDate: isoDateZ,
  endDate: isoDateZ,
  focus: z.string().max(500).nullable().optional(),
});
export type PhaseInput = z.input<typeof phaseInputZ>;

export async function listPhases(userId: string, programId: string) {
  return db
    .select()
    .from(programPhases)
    .where(and(eq(programPhases.userId, userId), eq(programPhases.programId, programId)))
    .orderBy(asc(programPhases.startDate));
}

export async function getPhase(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(programPhases)
    .where(and(eq(programPhases.userId, userId), eq(programPhases.id, id)))
    .limit(1);
  return row ?? null;
}

// Phase active on a given date, within a program.
export async function phaseAt(userId: string, programId: string, date: string) {
  const [row] = await db
    .select()
    .from(programPhases)
    .where(
      and(
        eq(programPhases.userId, userId),
        eq(programPhases.programId, programId),
        lte(programPhases.startDate, date),
        gte(programPhases.endDate, date),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createPhase(userId: string, input: PhaseInput) {
  const parsed = phaseInputZ.parse(input);
  if (parsed.startDate > parsed.endDate) {
    throw new ServiceError("VALIDATION", "Tanggal mulai harus sebelum tanggal selesai.");
  }
  const [row] = await db
    .insert(programPhases)
    .values({
      userId,
      programId: parsed.programId,
      name: parsed.name,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      focus: parsed.focus ?? null,
    })
    .returning();
  return row;
}

export async function updatePhase(userId: string, id: string, input: Partial<PhaseInput>) {
  if (input.startDate && input.endDate && input.startDate > input.endDate) {
    throw new ServiceError("VALIDATION", "Tanggal mulai harus sebelum tanggal selesai.");
  }
  const [row] = await db
    .update(programPhases)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.focus !== undefined && { focus: input.focus ?? null }),
      updatedAt: new Date(),
    })
    .where(and(eq(programPhases.userId, userId), eq(programPhases.id, id)))
    .returning();
  if (!row) throw new ServiceError("NOT_FOUND", "Phase not found");
  return row;
}

export async function deletePhase(userId: string, id: string) {
  const [row] = await db
    .delete(programPhases)
    .where(and(eq(programPhases.userId, userId), eq(programPhases.id, id)))
    .returning({ id: programPhases.id });
  if (!row) throw new ServiceError("NOT_FOUND", "Phase not found");
  return row;
}

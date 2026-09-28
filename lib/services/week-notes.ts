import { and, between, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { weekNotes } from "@/db/schema";

export async function getWeekNote(userId: string, weekStart: string) {
  const [row] = await db
    .select()
    .from(weekNotes)
    .where(and(eq(weekNotes.userId, userId), eq(weekNotes.weekStart, weekStart)))
    .limit(1);
  return row ?? null;
}

export async function listWeekNotesRange(userId: string, from: string, to: string) {
  return db
    .select()
    .from(weekNotes)
    .where(and(eq(weekNotes.userId, userId), between(weekNotes.weekStart, from, to)));
}

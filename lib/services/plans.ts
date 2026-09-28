import { and, between, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  plannedBlocks,
  plannedItems,
  plannedSessions,
  programPhases,
  programs,
  weekNotes,
} from "@/db/schema";
import { ServiceError } from "@/lib/utils/errors";
import { planImportZ, type PlanImport } from "@/lib/schemas/plan-import";
import { addDays } from "@/lib/utils/dates";

export type ApplyImportResult = {
  programId: string | null;
  sessionsInserted: number;
  weekNotesInserted: number;
  phasesInserted: number;
};

/**
 * Apply a plan import.
 * mode='add': insert everything as new rows. Doesn't touch existing sessions.
 * Mode 'replace_week' is v2 per spec.
 */
export async function applyImport(
  userId: string,
  input: PlanImport,
  opts: { targetProgramId?: string } = {},
): Promise<ApplyImportResult> {
  const parsed = planImportZ.parse(input);

  return db.transaction(async (tx) => {
    let programId = opts.targetProgramId ?? null;

    if (programId) {
      const [existing] = await tx
        .select({ id: programs.id })
        .from(programs)
        .where(and(eq(programs.userId, userId), eq(programs.id, programId)))
        .limit(1);
      if (!existing) throw new ServiceError("NOT_FOUND", "Target program not found");
    } else if (parsed.program) {
      const [p] = await tx
        .insert(programs)
        .values({
          userId,
          name: parsed.program.name,
          type: parsed.program.type,
          status: "draft",
          goal: parsed.program.goal,
          startDate: parsed.program.start_date,
          endDate: parsed.program.end_date,
          notes: parsed.program.notes,
        })
        .returning({ id: programs.id });
      programId = p.id;
    }

    // Insert phases (only if we have a program).
    let phasesInserted = 0;
    if (programId && parsed.phases.length > 0) {
      for (const ph of parsed.phases) {
        await tx.insert(programPhases).values({
          userId,
          programId,
          name: ph.name,
          startDate: ph.start_date,
          endDate: ph.end_date,
          focus: ph.focus,
        });
        phasesInserted += 1;
      }
    }

    let weekNotesInserted = 0;
    for (const wn of parsed.week_notes) {
      await tx
        .insert(weekNotes)
        .values({
          userId,
          weekStart: wn.week_start,
          context: wn.context ?? null,
          principles: wn.principles,
        })
        .onConflictDoUpdate({
          target: [weekNotes.userId, weekNotes.weekStart],
          set: { context: wn.context ?? null, principles: wn.principles, updatedAt: new Date() },
        });
      weekNotesInserted += 1;
    }

    let sessionsInserted = 0;
    for (const s of parsed.sessions) {
      const [session] = await tx
        .insert(plannedSessions)
        .values({
          userId,
          date: s.date,
          programId,
          sport: s.sport,
          sessionType: s.session_type ?? null,
          title: s.title ?? null,
          description: s.description ?? null,
          targetDurationMinSec: s.target_duration_min ? s.target_duration_min * 60 : null,
          targetDurationMaxSec: s.target_duration_max ? s.target_duration_max * 60 : null,
          targetDistanceM: s.target_distance_km ? Math.round(s.target_distance_km * 1000) : null,
          targetIntensity: s.target_intensity ?? null,
        })
        .returning({ id: plannedSessions.id });

      for (const [bi, block] of s.blocks.entries()) {
        const [b] = await tx
          .insert(plannedBlocks)
          .values({
            userId,
            sessionId: session.id,
            position: bi,
            name: block.name ?? null,
            rounds: block.rounds,
            notes: block.notes ?? null,
          })
          .returning({ id: plannedBlocks.id });

        if (block.items.length > 0) {
          await tx.insert(plannedItems).values(
            block.items.map((item, ii) => ({
              userId,
              blockId: b.id,
              position: ii,
              name: item.name,
              sets: item.sets ?? null,
              reps: item.reps ?? null,
              durationSec: item.duration_sec ?? null,
              distanceM: item.distance_m ?? null,
              loadKg: item.load_kg?.toString() ?? null,
              restSec: item.rest_sec ?? null,
              target: item.target ?? null,
              notes: item.notes ?? null,
            })),
          );
        }
      }

      sessionsInserted += 1;
    }

    return { programId, sessionsInserted, weekNotesInserted, phasesInserted };
  });
}

// Copy sessions (+ blocks + items) from one date to another. Reset status to planned.
export async function duplicateWeek(userId: string, fromWeekStart: string, toWeekStart: string) {
  return db.transaction(async (tx) => {
    const fromEnd = addDays(fromWeekStart, 6);
    const sessions = await tx
      .select()
      .from(plannedSessions)
      .where(
        and(
          eq(plannedSessions.userId, userId),
          between(plannedSessions.date, fromWeekStart, fromEnd),
        ),
      );

    let copied = 0;
    for (const s of sessions) {
      const offset = daysBetweenIso(fromWeekStart, s.date);
      const newDate = addDays(toWeekStart, offset);
      const [ns] = await tx
        .insert(plannedSessions)
        .values({
          userId,
          date: newDate,
          programId: s.programId,
          position: s.position,
          sport: s.sport,
          sessionType: s.sessionType,
          title: s.title,
          description: s.description,
          targetDurationMinSec: s.targetDurationMinSec,
          targetDurationMaxSec: s.targetDurationMaxSec,
          targetDistanceM: s.targetDistanceM,
          targetIntensity: s.targetIntensity,
          status: "planned",
        })
        .returning({ id: plannedSessions.id });

      const blocks = await tx
        .select()
        .from(plannedBlocks)
        .where(and(eq(plannedBlocks.userId, userId), eq(plannedBlocks.sessionId, s.id)));
      for (const b of blocks) {
        const [nb] = await tx
          .insert(plannedBlocks)
          .values({
            userId,
            sessionId: ns.id,
            position: b.position,
            name: b.name,
            rounds: b.rounds,
            notes: b.notes,
          })
          .returning({ id: plannedBlocks.id });
        const items = await tx
          .select()
          .from(plannedItems)
          .where(and(eq(plannedItems.userId, userId), eq(plannedItems.blockId, b.id)));
        if (items.length > 0) {
          await tx.insert(plannedItems).values(
            items.map((i) => ({
              userId,
              blockId: nb.id,
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
      copied += 1;
    }
    return { copied };
  });
}

function daysBetweenIso(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const ta = Date.UTC(ay, am - 1, ad);
  const tb = Date.UTC(by, bm - 1, bd);
  return Math.round((tb - ta) / (1000 * 60 * 60 * 24));
}

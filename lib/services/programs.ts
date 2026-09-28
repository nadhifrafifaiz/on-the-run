import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { programs } from "@/db/schema";
import { ServiceError } from "@/lib/utils/errors";
import { programInputZ, type ProgramInput } from "@/lib/schemas/forms";

export async function listPrograms(userId: string) {
  return db.select().from(programs).where(eq(programs.userId, userId));
}

export async function getProgram(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(programs)
    .where(and(eq(programs.userId, userId), eq(programs.id, id)))
    .limit(1);
  return row ?? null;
}

export async function createProgram(userId: string, input: ProgramInput) {
  const parsed = programInputZ.parse(input);
  const [row] = await db
    .insert(programs)
    .values({ userId, ...parsed })
    .returning();
  return row;
}

export async function updateProgram(userId: string, id: string, input: Partial<ProgramInput>) {
  const [row] = await db
    .update(programs)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(programs.userId, userId), eq(programs.id, id)))
    .returning();
  if (!row) throw new ServiceError("NOT_FOUND", "Program not found");
  return row;
}

// Enforces "one main program active per user" server-side.
// The DB has a partial unique index as the ultimate guard.
export async function activateProgram(userId: string, id: string) {
  return db.transaction(async (tx) => {
    const [target] = await tx
      .select()
      .from(programs)
      .where(and(eq(programs.userId, userId), eq(programs.id, id)))
      .limit(1);
    if (!target) throw new ServiceError("NOT_FOUND", "Program not found");
    if (target.type === "main") {
      const existing = await tx
        .select({ id: programs.id })
        .from(programs)
        .where(
          and(
            eq(programs.userId, userId),
            eq(programs.type, "main"),
            eq(programs.status, "active"),
            ne(programs.id, id),
          ),
        );
      if (existing.length > 0) {
        throw new ServiceError(
          "CONFLICT",
          "Sudah ada program main aktif. Arsipkan dulu sebelum mengaktifkan yang baru.",
        );
      }
    }
    const [updated] = await tx
      .update(programs)
      .set({ status: "active", updatedAt: new Date() })
      .where(and(eq(programs.userId, userId), eq(programs.id, id)))
      .returning();
    return updated;
  });
}

export async function archiveProgram(userId: string, id: string) {
  return updateProgram(userId, id, { status: "archived" });
}

// Count planned sessions attached to a program (for pre-delete warning).
// Returns { total, locked } — locked = has activity_id, can't be deleted.
export async function countProgramSessions(
  userId: string,
  id: string,
): Promise<{ total: number; locked: number }> {
  const { sql } = await import("drizzle-orm");
  const rows = await db.execute<{ total: number; locked: number }>(
    sql`select
          count(*)::int as total,
          count(*) filter (where activity_id is not null)::int as locked
        from planned_sessions
        where user_id = ${userId}::uuid and program_id = ${id}::uuid`,
  );
  return rows[0] ?? { total: 0, locked: 0 };
}

// Delete a program.
// - deleteSessions=false (default): sessions become orphans (program_id → null).
// - deleteSessions=true: also delete all sessions (and their blocks/items via cascade).
//   Sessions with activity_id set are locked and refused (they represent completed work).
export async function deleteProgram(
  userId: string,
  id: string,
  opts: { deleteSessions?: boolean } = {},
) {
  const { sql } = await import("drizzle-orm");
  return db.transaction(async (tx) => {
    // Verify ownership first.
    const [prog] = await tx
      .select({ id: programs.id })
      .from(programs)
      .where(and(eq(programs.userId, userId), eq(programs.id, id)))
      .limit(1);
    if (!prog) throw new ServiceError("NOT_FOUND", "Program not found");

    if (opts.deleteSessions) {
      // Refuse if any session is already linked to an activity.
      const locked = await tx.execute<{ c: number }>(
        sql`select count(*)::int as c from planned_sessions
            where user_id = ${userId}::uuid and program_id = ${id}::uuid and activity_id is not null`,
      );
      if (locked[0]?.c > 0) {
        throw new ServiceError(
          "CONFLICT",
          `${locked[0].c} sesi sudah tertaut ke aktivitas — tidak bisa dihapus. Pisahkan aktivitas dulu, atau pilih opsi "biarkan jadi sesi lepas".`,
        );
      }
      // Delete all sessions belonging to the program. Blocks/items cascade via FK.
      await tx.execute(
        sql`delete from planned_sessions where user_id = ${userId}::uuid and program_id = ${id}::uuid`,
      );
    }
    // Finally delete the program. Remaining sessions (if any) get program_id = null via FK.
    await tx
      .delete(programs)
      .where(and(eq(programs.userId, userId), eq(programs.id, id)));
    return { id };
  });
}

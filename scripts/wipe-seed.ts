/**
 * Wipe seed dummy data for the first auth user.
 *
 * Deletes:
 *   - Program "FM 2027 Base" (dummy from seed.ts) + its 7 planned sessions + blocks + items
 *   - Week note for 2026-09-21 (dummy)
 *   - Athlete metrics from 2026-01-01 (dummy — the real one is 2026-09-20 from Notion)
 *   - 1 manual test activity from db/seed.ts (2026-09-14, "Easy shakeout")
 *
 * PRESERVES:
 *   - Profile
 *   - All 70 activities from Notion (source='notion')
 *   - All 3 races from Notion
 *   - Metrics history from Notion (2026-09-20)
 *
 * Usage:
 *   npm run wipe:seed              # dry-run
 *   npm run wipe:seed -- --commit  # actually delete
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { and, eq, sql as dsql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  activities,
  athleteMetricsHistory,
  plannedBlocks,
  plannedItems,
  plannedSessions,
  programs,
} from "@/db/schema";

const commit = process.argv.includes("--commit");

async function firstUserId(): Promise<string> {
  const rows = await db.execute<{ id: string; email: string | null }>(
    dsql`select id, email from auth.users order by created_at asc limit 1`,
  );
  if (!rows[0]) throw new Error("No auth.users rows.");
  console.log(`User: ${rows[0].email} (${rows[0].id})`);
  return rows[0].id;
}

async function main() {
  console.log(`Mode: ${commit ? "COMMIT" : "DRY-RUN"}\n`);
  const userId = await firstUserId();

  // ---- 1. Dummy program(s) named exactly "FM 2027 Base" from seed
  const dummyPrograms = await db
    .select({ id: programs.id, name: programs.name, status: programs.status })
    .from(programs)
    .where(and(eq(programs.userId, userId), eq(programs.name, "FM 2027 Base")));
  console.log(`\nDummy programs to delete: ${dummyPrograms.length}`);
  for (const p of dummyPrograms) console.log(`  · ${p.name} [${p.status}] ${p.id}`);

  // ---- 2. All planned_sessions belonging to those programs (cascades will handle blocks + items)
  const sessionCount = await db.execute<{ c: number }>(
    dsql`select count(*)::int as c from planned_sessions where user_id = ${userId}::uuid and program_id in (
      select id from programs where user_id = ${userId}::uuid and name = 'FM 2027 Base'
    )`,
  );
  console.log(`Planned sessions to delete: ${sessionCount[0].c}`);

  // ---- 3. Dummy week note (from seed: current monday, context contains "Minggu awal base")
  const dummyNotes = await db.execute<{ id: string; ws: string; ctx: string | null }>(
    dsql`select id, week_start::text as ws, context as ctx from week_notes
         where user_id = ${userId}::uuid and context like 'Minggu awal base%'`,
  );
  console.log(`Dummy week notes to delete: ${dummyNotes.length}`);
  for (const n of dummyNotes) console.log(`  · ${n.ws}: ${n.ctx}`);

  // ---- 4. Dummy metrics history from 2026-01-01
  const dummyMetrics = await db
    .select()
    .from(athleteMetricsHistory)
    .where(
      and(
        eq(athleteMetricsHistory.userId, userId),
        eq(athleteMetricsHistory.effectiveFrom, "2026-01-01"),
      ),
    );
  console.log(`Dummy metrics rows to delete: ${dummyMetrics.length}`);

  // ---- 5. Dummy test activity: source=manual, title contains "Easy shakeout"
  const dummyActs = await db.execute<{ id: string; date: string; title: string | null }>(
    dsql`select id, date::text, title from activities
         where user_id = ${userId}::uuid and source = 'manual'::source and title = 'Easy shakeout'`,
  );
  console.log(`Dummy manual activities to delete: ${dummyActs.length}`);
  for (const a of dummyActs) console.log(`  · ${a.date}: ${a.title} (${a.id})`);

  if (!commit) {
    console.log("\n(dry-run — nothing changed. Re-run with --commit to actually delete.)");
    process.exit(0);
  }

  // ---- Commit deletes ----
  await db.transaction(async (tx) => {
    // Delete planned items → blocks → sessions belonging to dummy programs
    for (const p of dummyPrograms) {
      const sessionIds = await tx
        .select({ id: plannedSessions.id })
        .from(plannedSessions)
        .where(
          and(eq(plannedSessions.userId, userId), eq(plannedSessions.programId, p.id)),
        );
      for (const s of sessionIds) {
        const blockIds = await tx
          .select({ id: plannedBlocks.id })
          .from(plannedBlocks)
          .where(and(eq(plannedBlocks.userId, userId), eq(plannedBlocks.sessionId, s.id)));
        for (const b of blockIds) {
          await tx
            .delete(plannedItems)
            .where(and(eq(plannedItems.userId, userId), eq(plannedItems.blockId, b.id)));
        }
        await tx
          .delete(plannedBlocks)
          .where(and(eq(plannedBlocks.userId, userId), eq(plannedBlocks.sessionId, s.id)));
      }
      await tx
        .delete(plannedSessions)
        .where(and(eq(plannedSessions.userId, userId), eq(plannedSessions.programId, p.id)));
      await tx.delete(programs).where(and(eq(programs.userId, userId), eq(programs.id, p.id)));
    }

    // Delete dummy week notes
    for (const n of dummyNotes) {
      await tx.execute(dsql`delete from week_notes where id = ${n.id}::uuid`);
    }

    // Delete dummy metrics rows
    for (const m of dummyMetrics) {
      await tx
        .delete(athleteMetricsHistory)
        .where(eq(athleteMetricsHistory.id, m.id));
    }

    // Delete dummy manual activities
    for (const a of dummyActs) {
      await tx.delete(activities).where(eq(activities.id, a.id));
    }
  });

  console.log("\n✓ Seed dummy wiped. Notion data preserved.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Wipe failed:", e);
  process.exit(1);
});

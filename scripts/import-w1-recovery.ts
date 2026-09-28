/**
 * Import W1 Recovery week (Sep 21–27, 2026) from Notion into planned_sessions.
 *
 * Source: page "🌱 [W1 - Recovery] This Week — Sep 21-27, 2026" (Notion)
 * Data is hardcoded here because parsing the table is 1-off and simpler
 * to just encode explicitly. See docs/spec.md for why.
 *
 * Creates:
 *   - Program "Post-HM Recovery" (main → but only if no other main is active)
 *   - Week note for 2026-09-21
 *   - 7 planned sessions (Mon–Sun)
 *   - Sets each session's status based on Notion "Aktual" column
 *   - Auto-links to existing Notion activities where date matches
 *
 * Usage:
 *   npm run import:w1-recovery
 *   npm run import:w1-recovery -- --commit
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { and, between, eq, sql as dsql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  activities,
  plannedBlocks,
  plannedItems,
  plannedSessions,
  programs,
  weekNotes,
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

type SessionSpec = {
  date: string;
  sport: "run" | "strength" | "hiit" | "cycling" | "swim" | "mobility" | "walk" | "rest" | "other";
  sessionType?: "easy" | "long" | "tempo" | "interval" | "recovery" | "race" | "strength" | "hiit" | "mobility" | "cross" | "rest" | "other";
  title: string;
  description?: string;
  targetDurationMinSec?: number; // seconds
  targetDurationMaxSec?: number;
  targetIntensity?: string;
  status: "planned" | "done" | "skipped" | "modified";
  statusNote?: string;
};

// Sept 20 = race day, already an activity — skip.
const SESSIONS: SessionSpec[] = [
  {
    date: "2026-09-21",
    sport: "rest",
    title: "Full rest",
    description: "Post-race recovery. H+1.",
    status: "done",
    statusNote: "Pijat reflexology, pusing sempat muncul (dehidrasi/tension, sudah reda)",
  },
  {
    date: "2026-09-22",
    sport: "rest",
    title: "Full rest",
    description: "Post-race recovery. H+2.",
    status: "done",
  },
  {
    date: "2026-09-23",
    sport: "run",
    sessionType: "easy",
    title: "Easy Run 20-25 menit",
    description: "Z1-Z2 murni, restart running post-race.",
    targetDurationMinSec: 20 * 60,
    targetDurationMaxSec: 25 * 60,
    targetIntensity: "Z1-Z2",
    status: "skipped",
    statusNote: "Masih ngantuk pagi, postponed ke Kamis",
  },
  {
    date: "2026-09-24",
    sport: "rest",
    title: "Rest atau jalan kaki santai",
    description: "Original plan: rest atau walk. Aktual: dilakukan easy run kecil.",
    status: "modified",
    statusNote: "Emotional run — insight penting soal keluarga muncul saat lari (3.40km, RPE1)",
  },
  {
    date: "2026-09-25",
    sport: "run",
    sessionType: "easy",
    title: "Easy Run 25-30 menit",
    description: "Z1-Z2, restart continuous running.",
    targetDurationMinSec: 25 * 60,
    targetDurationMaxSec: 30 * 60,
    targetIntensity: "Z1-Z2",
    status: "done",
    statusNote:
      "First night run test — HR lebih tinggi dari pagi (circadian drift). Insight: HR jadi patokan tunggal easy run ke depan, bukan pace",
  },
  {
    date: "2026-09-26",
    sport: "rest",
    title: "Rest atau easy jalan kaki",
    description: "Original plan: rest. Revisi: sepeda ~20km easy-moderate pagi.",
    status: "modified",
    statusNote: "Revisi ke sepeda cross-training",
  },
  {
    date: "2026-09-27",
    sport: "run",
    sessionType: "easy",
    title: "Easy Run 30 menit atau rest",
    description: "Kalau badan sudah nyaman. Revisi: ST Leg Day.",
    targetDurationMinSec: 30 * 60,
    targetIntensity: "Z1-Z2",
    status: "modified",
    statusNote: "Revisi ke strength Leg Day",
  },
];

const WEEK_NOTE = {
  weekStart: "2026-09-21",
  context:
    "Phase 0 Recovery (H+0..H+7). Prioritas full recovery, bukan progress. Training block resmi HM2 mulai W1 sekitar 5 Oktober.",
  principles: [
    "Zero intensity — semua run Z1-Z2 murni, gak ada strides/tempo/interval",
    "DOMS & residual fatigue itu normal — kalau masih berat, geser/skip tanpa ragu",
    "Durasi naik dikit-dikit berdasarkan respons badan, bukan target kaku",
    "ST belum masuk minggu ini — mulai lagi pelan-pelan W2 kalau badan sudah nyaman",
    "Tujuan minggu ini cuma 1: badan balik nyaman gerak, bukan progress apapun",
  ],
};

async function main() {
  console.log(`Mode: ${commit ? "COMMIT" : "DRY-RUN"}\n`);
  const userId = await firstUserId();

  // Preview
  console.log("\nProgram: Post-HM Recovery (Sep 21 - Oct 4, 2026)");
  console.log(`Week note: ${WEEK_NOTE.weekStart}`);
  console.log(`  Context: ${WEEK_NOTE.context}`);
  console.log(`  Principles: ${WEEK_NOTE.principles.length}`);
  console.log(`\nPlanned sessions: ${SESSIONS.length}`);
  for (const s of SESSIONS) {
    const dur =
      s.targetDurationMinSec != null
        ? `${Math.round(s.targetDurationMinSec / 60)}${s.targetDurationMaxSec ? "-" + Math.round(s.targetDurationMaxSec / 60) : ""}m`
        : "";
    console.log(
      `  · ${s.date} ${s.sport.padEnd(9)} ${s.title.padEnd(40)} ${dur.padEnd(8)} [${s.status}]`,
    );
  }

  // Show what would auto-link
  console.log("\nExisting Notion activities in this range that will be auto-linked:");
  const acts = await db
    .select({
      id: activities.id,
      date: activities.date,
      sport: activities.sport,
      title: activities.title,
      distanceM: activities.distanceM,
    })
    .from(activities)
    .where(and(eq(activities.userId, userId), between(activities.date, "2026-09-21", "2026-09-27")));
  for (const a of acts) {
    const match = SESSIONS.find(
      (s) =>
        s.date === a.date &&
        (s.sport === a.sport || (s.sport === "rest" && a.sport === "run")), // "rest → became run" matches too
    );
    console.log(
      `  · ${a.date} ${a.sport.padEnd(9)} ${(a.title ?? "").padEnd(40)} ${(a.distanceM ?? 0) / 1000}km  →  ${match ? "match: " + match.title : "no match"}`,
    );
  }

  if (!commit) {
    console.log("\n(dry-run — nothing changed. Re-run with --commit to actually import.)");
    process.exit(0);
  }

  // ---- Commit ----
  await db.transaction(async (tx) => {
    // Program
    const [prog] = await tx
      .insert(programs)
      .values({
        userId,
        name: "Post-HM Recovery",
        type: "main",
        status: "active",
        startDate: "2026-09-21",
        endDate: "2026-10-04",
        goal: "Recovery penuh dari HM Bandung, siap masuk W1 training block HM2 ~5 Oktober",
        notes:
          "Phase 0 — bukan bagian dari W1-W21 training block. Fokus: badan balik nyaman gerak.",
      })
      .returning({ id: programs.id });

    // Week note
    await tx
      .insert(weekNotes)
      .values({
        userId,
        weekStart: WEEK_NOTE.weekStart,
        context: WEEK_NOTE.context,
        principles: WEEK_NOTE.principles,
      })
      .onConflictDoUpdate({
        target: [weekNotes.userId, weekNotes.weekStart],
        set: {
          context: WEEK_NOTE.context,
          principles: WEEK_NOTE.principles,
          updatedAt: new Date(),
        },
      });

    // Planned sessions
    for (const spec of SESSIONS) {
      // Find matching activity (same date, same sport OR rest→run "modified" case)
      const [matching] = await tx
        .select({ id: activities.id })
        .from(activities)
        .where(
          and(
            eq(activities.userId, userId),
            eq(activities.date, spec.date),
            spec.status === "modified"
              ? dsql`true`
              : eq(activities.sport, spec.sport),
          ),
        )
        .limit(1);

      const [session] = await tx
        .insert(plannedSessions)
        .values({
          userId,
          programId: prog.id,
          date: spec.date,
          sport: spec.sport,
          sessionType: spec.sessionType ?? null,
          title: spec.title,
          description: spec.description ?? null,
          targetDurationMinSec: spec.targetDurationMinSec ?? null,
          targetDurationMaxSec: spec.targetDurationMaxSec ?? null,
          targetIntensity: spec.targetIntensity ?? null,
          status: spec.status,
          statusNote: spec.statusNote ?? null,
          activityId: matching?.id ?? null,
        })
        .returning({ id: plannedSessions.id });

      // Add a single "Main" block if there are targets (so UI renders nicely)
      if (spec.sport !== "rest") {
        const [block] = await tx
          .insert(plannedBlocks)
          .values({
            userId,
            sessionId: session.id,
            position: 0,
            name: "Main",
            rounds: 1,
          })
          .returning({ id: plannedBlocks.id });
        if (spec.sport === "run") {
          await tx.insert(plannedItems).values({
            userId,
            blockId: block.id,
            position: 0,
            name: "Easy run",
            durationSec: spec.targetDurationMinSec ?? null,
            target: spec.targetIntensity ?? null,
          });
        }
      }
    }
  });

  console.log("\n✓ W1 Recovery imported.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Import failed:", e);
  process.exit(1);
});

/**
 * Dev seed: populates one active main program + a week of planned sessions +
 * a couple of logged activities for a target user.
 *
 * Usage:
 *   npx tsx db/seed.ts              # first auth.users row
 *   npx tsx db/seed.ts USER_UUID    # specific user
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { db } from "./client";
import { deleteAllUserData } from "@/lib/services/account";
import { activateProgram, createProgram } from "@/lib/services/programs";
import { applyImport } from "@/lib/services/plans";
import { logActivity } from "@/lib/services/activities";
import { addMetricsHistory } from "@/lib/services/metrics";
import { upsertProfile } from "@/lib/services/profiles";
import { toIsoDate, weekStartOf, addDays } from "@/lib/utils/dates";

async function resolveUserId(argv: string[]): Promise<string> {
  if (argv[2]) return argv[2];
  const rows = await db.execute<{ id: string; email: string | null }>(
    sql`select id, email from auth.users order by created_at asc limit 1`,
  );
  const first = rows[0];
  if (!first) {
    throw new Error("No auth.users rows. Sign in once via /login, then re-run seed.");
  }
  console.log(`Using first auth user: ${first.email} (${first.id})`);
  return first.id;
}

async function main() {
  const userId = await resolveUserId(process.argv);

  console.log("Wiping existing data for this user…");
  await deleteAllUserData(userId);

  console.log("Upserting profile…");
  await upsertProfile(userId, {
    displayName: "Nadhif",
    timezone: "Asia/Jakarta",
    units: "metric",
    weekStart: "monday",
  });

  console.log("Adding baseline athlete metrics…");
  await addMetricsHistory(userId, {
    effectiveFrom: "2026-01-01",
    maxHr: 195,
    restingHr: 55,
    lthr: 172,
    hrZones: {
      z1: { min: 117, max: 138 },
      z2: { min: 139, max: 154 },
      z3: { min: 155, max: 170 },
      z4: { min: 171, max: 180 },
      z5: { min: 181, max: 195 },
    },
    vo2max: 38,
    targetCadenceSpm: 180,
  });

  console.log("Creating + activating main program…");
  const program = await createProgram(userId, {
    name: "FM 2027 Base",
    type: "main",
    status: "draft",
    goal: "Finish first full marathon under 4:30",
  });
  await activateProgram(userId, program.id);

  const today = toIsoDate(new Date());
  const monday = weekStartOf(today, "monday");
  console.log(`Seeding a week starting ${monday}…`);

  await applyImport(
    userId,
    {
      schema: "plan",
      version: 1,
      week_notes: [
        {
          week_start: monday,
          context: "Minggu awal base — jaga semua run di Z1–Z2",
          principles: ["Semua run Z1-Z2", "Strength dua kali"],
        },
      ],
      sessions: [
        {
          date: monday,
          sport: "run",
          session_type: "easy",
          title: "Easy Run",
          target_duration_min: 30,
          target_duration_max: 35,
          target_intensity: "Z1-Z2",
          blocks: [
            {
              name: "Main",
              rounds: 1,
              items: [{ name: "Easy jog", duration_sec: 1800, target: "HR 139-154" }],
            },
            {
              name: "Strides",
              rounds: 1,
              items: [{ name: "Strides", sets: 4, distance_m: 80, rest_sec: 60 }],
            },
          ],
        },
        {
          date: addDays(monday, 1),
          sport: "strength",
          title: "Hip & Core",
          blocks: [
            {
              name: "Circuit",
              rounds: 3,
              items: [
                { name: "Glute bridge", reps: 15 },
                { name: "Band lateral walk", reps: 12, notes: "per sisi" },
                { name: "Plank", duration_sec: 45 },
              ],
            },
          ],
        },
        {
          date: addDays(monday, 2),
          sport: "run",
          session_type: "tempo",
          title: "Tempo 20'",
          target_duration_min: 45,
          target_intensity: "Z3",
          blocks: [
            {
              name: "Warmup",
              rounds: 1,
              items: [{ name: "Easy jog", duration_sec: 600 }],
            },
            {
              name: "Tempo",
              rounds: 1,
              items: [{ name: "Tempo", duration_sec: 1200, target: "HR 155-170" }],
            },
            {
              name: "Cooldown",
              rounds: 1,
              items: [{ name: "Easy jog", duration_sec: 600 }],
            },
          ],
        },
        {
          date: addDays(monday, 3),
          sport: "rest",
          title: "Rest",
          blocks: [],
        },
        {
          date: addDays(monday, 4),
          sport: "run",
          session_type: "easy",
          title: "Easy Run",
          target_duration_min: 40,
          target_intensity: "Z1-Z2",
          blocks: [
            { name: "Main", rounds: 1, items: [{ name: "Easy jog", duration_sec: 2400 }] },
          ],
        },
        {
          date: addDays(monday, 5),
          sport: "strength",
          title: "Full body",
          blocks: [
            {
              name: "Main",
              rounds: 3,
              items: [
                { name: "Goblet squat", reps: 10, load_kg: 16 },
                { name: "Push-up", reps: 12 },
                { name: "Pull-up", reps: 6 },
              ],
            },
          ],
        },
        {
          date: addDays(monday, 6),
          sport: "run",
          session_type: "long",
          title: "Long Run",
          target_duration_min: 75,
          target_intensity: "Z2",
          blocks: [
            { name: "Main", rounds: 1, items: [{ name: "Long steady", duration_sec: 4500 }] },
          ],
        },
      ],
    },
    { targetProgramId: program.id },
  );

  console.log("Logging one past activity for context…");
  await logActivity(userId, {
    date: addDays(monday, -7),
    sport: "run",
    sessionType: "easy",
    title: "Easy shakeout",
    durationSec: 1800,
    distanceM: 5200,
    avgHr: 141,
    rpe: 3,
    feel: "good",
    source: "manual",
    run: { avgPaceSecPerKm: 346, cadenceSpm: 178 },
    items: [],
  });

  console.log("Seed done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

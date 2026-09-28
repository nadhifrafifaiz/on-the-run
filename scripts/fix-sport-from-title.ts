/**
 * Fix sport labels for activities whose title emoji contradicts the current
 * sport field. This happens because Notion "Run Log" contains cross-training
 * rows (cycling, swim, strength) that use 🚴/🏊/💪 emoji prefix but were
 * imported as sport='run'.
 *
 * Also removes run_metrics rows for activities that get re-labeled away from run.
 *
 * Usage:
 *   npm run fix:sport-from-title
 *   npm run fix:sport-from-title -- --commit
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { and, eq, sql as dsql } from "drizzle-orm";
import { db } from "@/db/client";
import { activities, runMetrics } from "@/db/schema";

const commit = process.argv.includes("--commit");

// Ordered — first match wins.
const SPORT_HINTS: Array<{ patterns: RegExp[]; sport: "run" | "cycling" | "swim" | "strength" | "hiit" | "walk" | "mobility" }> = [
  { patterns: [/🚴/, /\bcycling\b/i, /\bsepeda\b/i, /\bbike\b/i], sport: "cycling" },
  { patterns: [/🏊/, /\bswim(?:ming)?\b/i, /\brenang\b/i], sport: "swim" },
  { patterns: [/💪/, /\bstrength\b/i, /\bST\b/, /\bleg day\b/i, /\bcircuit\b/i], sport: "strength" },
  { patterns: [/🏋/, /HIIT/i], sport: "hiit" },
  { patterns: [/🚶/, /\bwalk(?:ing)?\b/i, /\bjalan kaki\b/i], sport: "walk" },
  { patterns: [/🧘/, /\bmobility\b/i, /\bstretch/i, /\byoga\b/i], sport: "mobility" },
];

function inferSport(title: string): "run" | "cycling" | "swim" | "strength" | "hiit" | "walk" | "mobility" | null {
  // If title mentions run/lari at all, keep as run — "Run-Walk Test" contains
  // both keywords but is primarily a run.
  if (/\brun\b/i.test(title) || /\blari\b/i.test(title) || /🏃/.test(title)) return "run";
  for (const hint of SPORT_HINTS) {
    if (hint.patterns.some((p) => p.test(title))) return hint.sport;
  }
  return null;
}

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

  const rows = await db
    .select({ id: activities.id, date: activities.date, sport: activities.sport, title: activities.title })
    .from(activities)
    .where(eq(activities.userId, userId));

  type Mismatch = { id: string; date: string; title: string; from: string; to: string };
  const mismatches: Mismatch[] = [];
  for (const r of rows) {
    const inferred = inferSport(r.title ?? "");
    if (inferred && inferred !== r.sport) {
      mismatches.push({
        id: r.id,
        date: r.date,
        title: r.title ?? "",
        from: r.sport,
        to: inferred,
      });
    }
  }

  console.log(`Total activities: ${rows.length}`);
  console.log(`Mismatches (title emoji vs sport): ${mismatches.length}\n`);
  for (const m of mismatches) {
    console.log(`  · ${m.date}  ${m.from.padEnd(9)} → ${m.to.padEnd(9)}  ${m.title.slice(0, 60)}`);
  }

  if (!commit) {
    console.log("\n(dry-run — nothing changed. Re-run with --commit to apply.)");
    process.exit(0);
  }

  await db.transaction(async (tx) => {
    for (const m of mismatches) {
      // Update sport
      await tx.execute(
        dsql`update activities set sport = ${m.to}::sport, updated_at = now() where id = ${m.id}::uuid`,
      );
      // If moving AWAY from run, drop the run_metrics row (it doesn't apply anymore)
      if (m.from === "run" && m.to !== "run") {
        await tx
          .delete(runMetrics)
          .where(and(eq(runMetrics.userId, userId), eq(runMetrics.activityId, m.id)));
      }
    }
  });

  console.log(`\n✓ ${mismatches.length} activities relabeled.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Fix failed:", e);
  process.exit(1);
});

/**
 * One-shot Notion → Supabase migration.
 *
 * Usage:
 *   npm run notion:migrate               # dry-run
 *   npm run notion:migrate -- --commit   # actually write
 *   npm run notion:migrate -- --commit --user <uuid>   # target specific user
 *
 * What it does:
 *   1. athlete_metrics_history — one row from Current Status
 *   2. races — Next Races table (3 rows), HM Bandung report as markdown
 *   3. activities + run_metrics — Run Log rows (source='notion')
 *
 * Idempotent: every activity/race carries extra_metrics.notion_id (or field).
 * Re-running with --commit does insert-on-conflict-update on that key.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  activities,
  athleteMetricsHistory,
  races,
} from "@/db/schema";
import {
  notion,
  getDefaultDataSourceId,
  forEachRow,
  forEachChildBlock,
  richText,
  dateStart,
  numberValue,
  richTextValue,
  selectValue,
  titleValue,
} from "./notion";
import {
  balanceToLR,
  durationToSec,
  mapFeel,
  mapRunType,
  paceToSecPerKm,
  standardEffortDistanceM,
} from "@/lib/utils/parsers";
import { pageToMarkdown } from "./to-markdown";

const HOMEPAGE_ID = process.env.NOTION_HOMEPAGE_ID!;
const RUN_LOG_DB_ID = "4de879c0-e1c4-4360-9e9c-97987b083799";
const RACE_REPORT_PAGE_ID = "3e262f8f-d5d1-810c-b94f-f081a0c398e9";

function roundOrNull(n: number | null): number | null {
  return n == null ? null : Math.round(n);
}

type Args = { commit: boolean; userId: string | null };
function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const commit = argv.includes("--commit");
  const uIdx = argv.indexOf("--user");
  const userId = uIdx >= 0 ? argv[uIdx + 1] : null;
  return { commit, userId };
}

async function resolveUserId(explicit: string | null): Promise<string> {
  if (explicit) return explicit;
  const rows = await db.execute<{ id: string; email: string | null }>(
    sql`select id, email from auth.users order by created_at asc limit 1`,
  );
  const first = rows[0];
  if (!first) throw new Error("No auth.users rows. Log in via /login first.");
  console.log(`Using first user: ${first.email} (${first.id})`);
  return first.id;
}

// -------------------- 1. Current Status → athlete_metrics_history --------------------

async function fetchCurrentStatusTable(): Promise<Map<string, string>> {
  const kids = await notion.blocks.children.list({ block_id: HOMEPAGE_ID, page_size: 100 });
  let currentHeading: string | null = null;
  let tableId: string | null = null;
  for (const b of kids.results) {
    const block = b as { type: string; id: string; heading_1?: { rich_text: unknown } };
    if (block.type === "heading_1") {
      currentHeading = richText(block.heading_1?.rich_text ?? []);
    } else if (block.type === "table" && currentHeading?.includes("Current Status")) {
      tableId = block.id;
      break;
    }
  }
  if (!tableId) throw new Error("Current Status table not found on homepage");
  const map = new Map<string, string>();
  await forEachChildBlock(tableId, (b) => {
    const row = b as { type: string; table_row?: { cells: Array<Array<{ plain_text: string }>> } };
    if (row.type !== "table_row" || !row.table_row) return;
    const [k, v] = row.table_row.cells.map((c) => c.map((x) => x.plain_text).join("").trim());
    if (k) map.set(k, v ?? "");
  });
  return map;
}

async function migrateAthleteMetrics(userId: string, args: Args) {
  console.log("\n📍 Current Status → athlete_metrics_history");
  const status = await fetchCurrentStatusTable();
  const vo2Raw = status.get("VO2Max") ?? "";
  const z2 = status.get("Zone 2 HR") ?? "";
  const cadenceRaw = status.get("Cadence") ?? "";

  // Parse "38 (watch) / ~40-41 (...)"
  const vo2Match = vo2Raw.match(/(\d+(?:\.\d+)?)/);
  const vo2max = vo2Match ? Number(vo2Match[1]) : null;
  // Parse "139–154 bpm" or "139-154"
  const zMatch = z2.match(/(\d+)\s*[–-]\s*(\d+)/);
  const z2Min = zMatch ? Number(zMatch[1]) : null;
  const z2Max = zMatch ? Number(zMatch[2]) : null;
  // Parse "~180 spm"
  const cadMatch = cadenceRaw.match(/(\d+)\s*spm/);
  const targetCadence = cadMatch ? Number(cadMatch[1]) : null;

  const row = {
    userId,
    effectiveFrom: "2026-09-20", // HM Bandung day — most recent status snapshot
    vo2max: vo2max != null ? String(vo2max) : null,
    targetCadenceSpm: targetCadence,
    hrZones: z2Min && z2Max ? { z2: { min: z2Min, max: z2Max } } : null,
    notes: `Migrated from Notion Current Status. Raw VO2: "${vo2Raw}". Raw Cadence: "${cadenceRaw}".`,
  };
  console.log("  Row to insert:", { ...row, userId: "<userId>" });

  if (args.commit) {
    await db
      .insert(athleteMetricsHistory)
      .values(row)
      .onConflictDoUpdate({
        target: [athleteMetricsHistory.userId, athleteMetricsHistory.effectiveFrom],
        set: {
          vo2max: row.vo2max,
          targetCadenceSpm: row.targetCadenceSpm,
          hrZones: row.hrZones,
          notes: row.notes,
          updatedAt: new Date(),
        },
      });
    console.log("  ✓ inserted/updated 1 metrics row");
  } else {
    console.log("  (dry-run, skipped)");
  }
}

// -------------------- 2. Next Races → races --------------------

type ParsedRace = {
  notionRowId: string; // pseudo-id (heading+order), used for idempotency
  name: string;
  date: string; // ISO
  distanceLabel: "5K" | "10K" | "HM" | "FM" | "other" | null;
  distanceM: number | null;
  chipTimeSec: number | null;
  status: "planned" | "done";
  strategy: string | null;
  rankOverall?: number | null;
  totalOverall?: number | null;
  rankGender?: number | null;
  totalGender?: number | null;
  rankCategory?: number | null;
  totalCategory?: number | null;
};

async function fetchNextRacesTable(): Promise<Array<[string, string, string, string]>> {
  const kids = await notion.blocks.children.list({ block_id: HOMEPAGE_ID, page_size: 100 });
  let currentHeading: string | null = null;
  let tableId: string | null = null;
  for (const b of kids.results) {
    const block = b as { type: string; id: string; heading_1?: { rich_text: unknown } };
    if (block.type === "heading_1") currentHeading = richText(block.heading_1?.rich_text ?? []);
    else if (block.type === "table" && currentHeading?.includes("Next Races")) {
      tableId = block.id;
      break;
    }
  }
  if (!tableId) throw new Error("Next Races table not found");
  const rows: Array<string[]> = [];
  await forEachChildBlock(tableId, (b) => {
    const row = b as { type: string; table_row?: { cells: Array<Array<{ plain_text: string }>> } };
    if (row.type !== "table_row" || !row.table_row) return;
    rows.push(row.table_row.cells.map((c) => c.map((x) => x.plain_text).join("").trim()));
  });
  return rows.slice(1).map((r) => [r[0] ?? "", r[1] ?? "", r[2] ?? "", r[3] ?? ""]);
}

const MONTH_ID: Record<string, number> = {
  januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
  juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
};

function parseIndoDate(input: string): string | null {
  // "7 Juni 2026" | "26 Juli 2026" | "20 September 2026"
  const m = input.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTH_ID[m[2].toLowerCase()];
  const year = Number(m[3]);
  if (!month) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function labelToMeters(label: string): { label: ParsedRace["distanceLabel"]; m: number | null } {
  const l = label.toUpperCase().trim();
  if (l === "5K") return { label: "5K", m: 5000 };
  if (l === "10K") return { label: "10K", m: 10000 };
  if (l === "21K" || l === "HM") return { label: "HM", m: 21097 };
  if (l === "42K" || l === "FM") return { label: "FM", m: 42195 };
  return { label: "other", m: null };
}

function parseRaceStatusCell(cell: string): {
  status: "planned" | "done";
  chipTimeSec: number | null;
  strategy: string | null;
  rankings: {
    overall?: [number, number];
    gender?: [number, number];
    category?: [number, number];
  };
} {
  const trimmed = cell.trim();
  const done = /done|✅/i.test(trimmed);
  // Prefer H:MM:SS if present, else MM:SS (for short races like 5K/10K).
  const chipHms = trimmed.match(/(\d+):(\d{2}):(\d{2})/);
  const chipMs = !chipHms ? trimmed.match(/\b(\d{1,3}):(\d{2})\b/) : null;
  const chipTimeSec = chipHms
    ? Number(chipHms[1]) * 3600 + Number(chipHms[2]) * 60 + Number(chipHms[3])
    : chipMs
      ? Number(chipMs[1]) * 60 + Number(chipMs[2])
      : null;

  const rankings: { overall?: [number, number]; gender?: [number, number]; category?: [number, number] } = {};
  const overallM = trimmed.match(/Overall\s+(\d+)\/(\d+)/i) || trimmed.match(/position\s+(\d+)\/overall/i);
  if (overallM) rankings.overall = [Number(overallM[1]), Number(overallM[2] ?? 0)];
  const genderM = trimmed.match(/Gender\s+(\d+)\/(\d+)/i);
  if (genderM) rankings.gender = [Number(genderM[1]), Number(genderM[2])];
  const catM = trimmed.match(/(\d+)\/category/i);
  if (catM) rankings.category = [Number(catM[1]), 0];

  return {
    status: done ? "done" : "planned",
    chipTimeSec,
    strategy: trimmed || null,
    rankings,
  };
}

async function migrateRaces(userId: string, args: Args) {
  console.log("\n🎯 Next Races + HM Bandung report → races");
  const rows = await fetchNextRacesTable();
  console.log(`  Found ${rows.length} race row(s)`);

  const parsed: ParsedRace[] = [];
  for (const [name, jarak, tanggal, statusCell] of rows) {
    const date = parseIndoDate(tanggal);
    if (!date) {
      console.warn(`  ⚠ Skipping row (bad date): ${name} | ${tanggal}`);
      continue;
    }
    const { label, m } = labelToMeters(jarak);
    const st = parseRaceStatusCell(statusCell);
    parsed.push({
      notionRowId: `next-races:${name}:${date}`,
      name,
      date,
      distanceLabel: label,
      distanceM: m,
      chipTimeSec: st.chipTimeSec,
      status: st.status,
      strategy: st.strategy,
      rankOverall: st.rankings.overall?.[0] ?? null,
      totalOverall: st.rankings.overall?.[1] ?? null,
      rankGender: st.rankings.gender?.[0] ?? null,
      totalGender: st.rankings.gender?.[1] ?? null,
      rankCategory: st.rankings.category?.[0] ?? null,
      totalCategory: st.rankings.category?.[1] ?? null,
    });
  }
  for (const p of parsed) console.log("  ·", p.date, p.name, p.distanceLabel, p.chipTimeSec, p.status);

  const hmReport = await pageToMarkdown(RACE_REPORT_PAGE_ID);
  console.log(`  HM Bandung report: ${hmReport.length} chars of markdown`);

  if (!args.commit) {
    console.log("  (dry-run, skipped)");
    return;
  }

  // For idempotency: match on (userId, name, date). If a race matches, update; else insert.
  // We stash notion_row_id in a comment inside strategy to keep the primary shape clean.
  for (const p of parsed) {
    const existing = await db.execute<{ id: string }>(
      sql`select id from races where user_id = ${userId} and name = ${p.name} and date = ${p.date}::date limit 1`,
    );
    const isHmBandung = /pocari|bandung/i.test(p.name);
    const report = isHmBandung ? hmReport : null;
    const values = {
      userId,
      name: p.name,
      date: p.date,
      distanceLabel: p.distanceLabel,
      distanceM: p.distanceM,
      status: p.status as "planned" | "done",
      chipTimeSec: p.chipTimeSec,
      strategy: p.strategy,
      rankOverall: p.rankOverall,
      totalOverall: p.totalOverall,
      rankGender: p.rankGender,
      totalGender: p.totalGender,
      rankCategory: p.rankCategory,
      totalCategory: p.totalCategory,
      report,
    };
    if (existing.length > 0) {
      await db.execute(sql`
        update races set
          distance_label = ${values.distanceLabel},
          distance_m = ${values.distanceM},
          status = ${values.status}::race_status,
          chip_time_sec = ${values.chipTimeSec},
          strategy = ${values.strategy},
          rank_overall = ${values.rankOverall},
          total_overall = ${values.totalOverall},
          rank_gender = ${values.rankGender},
          total_gender = ${values.totalGender},
          rank_category = ${values.rankCategory},
          total_category = ${values.totalCategory},
          report = ${values.report},
          updated_at = now()
        where id = ${existing[0].id}::uuid
      `);
      console.log(`  ✓ updated ${p.name}`);
    } else {
      await db.insert(races).values(values);
      console.log(`  ✓ inserted ${p.name}`);
    }
  }
}

// -------------------- 3. Run Log → activities + run_metrics --------------------

async function migrateRunLog(userId: string, args: Args) {
  console.log("\n📊 Run Log → activities + run_metrics");
  const dsId = await getDefaultDataSourceId(RUN_LOG_DB_ID);

  type Row = {
    notionId: string;
    date: string;
    title: string;
    runType: string | null;
    distanceKm: number | null;
    durationSec: number | null;
    avgHr: number | null;
    maxHr: number | null;
    calories: number | null;
    trainingLoad: number | null;
    rpe: number | null;
    feel: string | null;
    coachNotes: string;
    paceSecPerKm: number | null;
    cadenceSpm: number | null;
    gctAvgMs: number | null;
    gctMinMs: number | null;
    balanceLeft: number | null;
    balanceRight: number | null;
    vo2max: number | null;
    weekNumber: number | null;
    trainingBlock: string | null;
  };
  const rows: Row[] = [];
  await forEachRow(dsId, (page) => {
    const p = page as { id: string; properties: Record<string, unknown> };
    const props = p.properties;
    const date = dateStart(props["Date"]);
    if (!date) return; // skip rows without a date

    const paceRaw = richTextValue(props["Avg Pace (/km)"]);
    const balRaw = richTextValue(props["Balance L/R"]);
    const bal = balanceToLR(balRaw);
    rows.push({
      notionId: p.id,
      date,
      title: titleValue(props["Run"]),
      runType: selectValue(props["Run Type"]),
      distanceKm: numberValue(props["Distance (km)"]),
      durationSec: durationToSec(richTextValue(props["Duration"])),
      // Notion number fields can be decimal; our integer columns require rounding.
      avgHr: roundOrNull(numberValue(props["Avg HR (bpm)"])),
      maxHr: roundOrNull(numberValue(props["Max HR (bpm)"])),
      calories: roundOrNull(numberValue(props["Calories"])),
      trainingLoad: roundOrNull(numberValue(props["Training Load"])),
      rpe: (() => {
        const n = numberValue(props["RPE (1-10)"]);
        if (n == null) return null;
        return Math.min(10, Math.max(1, Math.round(n)));
      })(),
      feel: selectValue(props["Feel"]),
      coachNotes: richTextValue(props["Coach Notes"]),
      paceSecPerKm: paceToSecPerKm(paceRaw),
      cadenceSpm: numberValue(props["Cadence (spm)"]),
      gctAvgMs: numberValue(props["GCT Avg (ms)"]),
      gctMinMs: numberValue(props["GCT Min (ms)"]),
      balanceLeft: bal?.left ?? null,
      balanceRight: bal?.right ?? null,
      vo2max: numberValue(props["VO2Max"]),
      weekNumber: numberValue(props["Week #"]),
      trainingBlock: selectValue(props["Training Block"]),
    });
  });

  // Validation: report rows with anomalies before we insert.
  const anomalies: string[] = [];
  for (const r of rows) {
    if (r.durationSec != null && (r.durationSec < 30 || r.durationSec > 8 * 3600)) {
      anomalies.push(`  ⚠ ${r.date} "${r.title}": duration ${r.durationSec}s out of range`);
    }
    if (r.avgHr != null && (r.avgHr < 30 || r.avgHr > 240)) {
      anomalies.push(`  ⚠ ${r.date} "${r.title}": avg HR ${r.avgHr} out of range`);
    }
    if (r.paceSecPerKm != null && (r.paceSecPerKm < 120 || r.paceSecPerKm > 1200)) {
      anomalies.push(`  ⚠ ${r.date} "${r.title}": pace ${r.paceSecPerKm}s/km out of range`);
    }
    if (r.rpe != null && (r.rpe < 1 || r.rpe > 10)) {
      anomalies.push(`  ⚠ ${r.date} "${r.title}": RPE ${r.rpe} out of range`);
    }
  }
  console.log(`  Parsed ${rows.length} rows.`);
  if (anomalies.length > 0) {
    console.log(`  Anomalies (${anomalies.length}):`);
    for (const a of anomalies) console.log(a);
  }

  // Dry-run preview
  const byType = new Map<string, number>();
  for (const r of rows) byType.set(r.runType ?? "(none)", (byType.get(r.runType ?? "(none)") ?? 0) + 1);
  console.log("  Run Type breakdown:", [...byType]);

  if (!args.commit) {
    console.log("  (dry-run, skipped)");
    return;
  }

  // Insert with idempotency on extra_metrics->>notion_id.
  let inserted = 0;
  let updated = 0;
  for (const r of rows) {
    const sessionType = mapRunType(r.runType) as
      | "easy" | "long" | "tempo" | "interval" | "recovery" | "race" | null;
    const feel = mapFeel(r.feel) as "great" | "good" | "okay" | "tough" | "bad" | null;
    const distanceM = r.distanceKm != null ? Math.round(r.distanceKm * 1000) : null;
    const effortDistance = sessionType === "race" ? standardEffortDistanceM(r.distanceKm) : null;
    const extraMetrics: Record<string, unknown> = {
      notion_id: r.notionId,
      notion_week: r.weekNumber,
      notion_training_block: r.trainingBlock,
      notion_avg_pace_raw: r.paceSecPerKm,
      notion_vo2max: r.vo2max,
    };

    // Skip if duration is way out of range — insert as a stub without duration
    // to preserve the row, but strip duration.
    const safeDuration =
      r.durationSec != null && r.durationSec >= 30 && r.durationSec <= 8 * 3600
        ? r.durationSec
        : null;

    const existing = await db.execute<{ id: string }>(
      sql`select id from activities where user_id = ${userId} and extra_metrics->>'notion_id' = ${r.notionId} limit 1`,
    );

    let activityId: string;
    if (existing.length > 0) {
      activityId = existing[0].id;
      await db.execute(sql`
        update activities set
          date = ${r.date}::date,
          sport = 'run'::sport,
          session_type = ${sessionType}::session_type,
          title = ${r.title || null},
          duration_sec = ${safeDuration},
          distance_m = ${distanceM},
          avg_hr = ${r.avgHr},
          max_hr = ${r.maxHr},
          calories = ${r.calories},
          training_load = ${r.trainingLoad},
          rpe = ${r.rpe},
          feel = ${feel}::feel,
          coach_notes = ${r.coachNotes || null},
          source = 'notion'::source,
          effort_distance_m = ${effortDistance},
          extra_metrics = ${JSON.stringify(extraMetrics)}::jsonb,
          updated_at = now()
        where id = ${activityId}::uuid
      `);
      updated += 1;
    } else {
      const [row] = await db
        .insert(activities)
        .values({
          userId,
          date: r.date,
          sport: "run",
          sessionType,
          title: r.title || null,
          durationSec: safeDuration,
          distanceM,
          avgHr: r.avgHr,
          maxHr: r.maxHr,
          calories: r.calories,
          trainingLoad: r.trainingLoad,
          rpe: r.rpe,
          feel,
          coachNotes: r.coachNotes || null,
          source: "notion",
          effortDistanceM: effortDistance,
          extraMetrics,
        })
        .returning({ id: activities.id });
      activityId = row.id;
      inserted += 1;
    }

    // Upsert run_metrics
    await db.execute(sql`
      insert into run_metrics (activity_id, user_id, avg_pace_sec_per_km, cadence_spm, gct_avg_ms, gct_min_ms, balance_left_pct, balance_right_pct, vo2max)
      values (
        ${activityId}::uuid,
        ${userId}::uuid,
        ${r.paceSecPerKm},
        ${r.cadenceSpm},
        ${r.gctAvgMs},
        ${r.gctMinMs},
        ${r.balanceLeft?.toString() ?? null},
        ${r.balanceRight?.toString() ?? null},
        ${r.vo2max?.toString() ?? null}
      )
      on conflict (activity_id) do update set
        avg_pace_sec_per_km = excluded.avg_pace_sec_per_km,
        cadence_spm = excluded.cadence_spm,
        gct_avg_ms = excluded.gct_avg_ms,
        gct_min_ms = excluded.gct_min_ms,
        balance_left_pct = excluded.balance_left_pct,
        balance_right_pct = excluded.balance_right_pct,
        vo2max = excluded.vo2max,
        updated_at = now()
    `);
  }
  console.log(`  ✓ ${inserted} inserted, ${updated} updated`);
}

// -------------------- 4. Link races → activities --------------------

async function linkRacesToActivities(userId: string, args: Args) {
  console.log("\n🔗 Linking races → activities by date");
  const raceRows = await db.execute<{ id: string; name: string; date: string }>(
    sql`select id, name, date::text from races where user_id = ${userId}`,
  );
  let linked = 0;
  for (const race of raceRows) {
    const acts = await db.execute<{ id: string }>(
      sql`
        select id from activities
        where user_id = ${userId}
          and date = ${race.date}::date
          and (session_type = 'race'::session_type or source = 'notion'::source)
        order by (session_type = 'race'::session_type) desc, distance_m desc nulls last
        limit 1
      `,
    );
    if (acts.length === 0) continue;
    if (args.commit) {
      await db.execute(
        sql`update races set activity_id = ${acts[0].id}::uuid, updated_at = now() where id = ${race.id}::uuid`,
      );
    }
    linked += 1;
    console.log(`  ${args.commit ? "✓" : "·"} ${race.name} → activity ${acts[0].id}`);
  }
  console.log(`  ${linked} race(s) linked`);
}

// -------------------- Verification --------------------

async function reportBestEfforts(userId: string) {
  console.log("\n🏆 Best-effort verification (from Supabase):");
  const bes = await db.execute<{
    label: string;
    time_sec: number;
    source_type: string;
    date: string;
  }>(sql`
    with race_bests as (
      select distance_label::text as label, chip_time_sec as time_sec, 'race' as source_type, date::text
      from races
      where user_id = ${userId} and chip_time_sec is not null and distance_label is not null
    ),
    act_bests as (
      select
        case effort_distance_m
          when 5000 then '5K'
          when 10000 then '10K'
          when 21097 then 'HM'
          when 42195 then 'FM'
        end as label,
        duration_sec as time_sec, 'activity' as source_type, date::text
      from activities
      where user_id = ${userId} and effort_distance_m is not null and duration_sec is not null
    ),
    combined as (
      select * from race_bests union all select * from act_bests
    )
    select distinct on (label) label, time_sec, source_type, date
    from combined
    order by label, time_sec asc
  `);
  for (const b of bes) {
    const m = Math.floor(b.time_sec / 60);
    const s = b.time_sec % 60;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    const fmt = h > 0 ? `${h}:${String(mm).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${mm}:${String(s).padStart(2, "0")}`;
    console.log(`  ${b.label}: ${fmt}  (${b.source_type}, ${b.date})`);
  }
}

// -------------------- Entry point --------------------

async function main() {
  const args = parseArgs();
  const mode = args.commit ? "COMMIT" : "DRY-RUN";
  console.log(`Mode: ${mode}\n`);
  const userId = await resolveUserId(args.userId);

  await migrateAthleteMetrics(userId, args);
  await migrateRunLog(userId, args);
  await migrateRaces(userId, args);
  await linkRacesToActivities(userId, args);

  if (args.commit) {
    await reportBestEfforts(userId);
  }
  console.log("\nDone.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});

// Compute the week structure for a program's timeline.
// Handles: explicit start_date/end_date, or derives range from sessions.
// Week always starts Monday for now (spec: profile.week_start).

import type { HydratedSession } from "@/lib/services/stats";
import { addDays, toIsoDate, weekStartOf } from "./dates";

export type ProgramWeek = {
  idx: number; // 1-based
  monday: string; // ISO date
  sunday: string; // ISO date
  sessions: HydratedSession[]; // sessions falling within this week
  isCurrent: boolean; // covers today
  isPast: boolean; // sunday < today
};

export type WeekGridSummary = {
  weeks: ProgramWeek[];
  currentWeekIdx: number | null; // week idx containing today, or null if none
  totalWeeks: number;
};

/**
 * Compute per-week grouping for a program's timeline.
 *
 * Range determination:
 *   1. If program.startDate + endDate both set → use those (bounds by monday/sunday).
 *   2. Else if sessions exist → min/max session date bounds.
 *   3. Else → single current week.
 */
export function computeProgramWeeks(
  program: { startDate: string | null; endDate: string | null },
  sessions: HydratedSession[],
  today: string = toIsoDate(new Date()),
): WeekGridSummary {
  // Determine the date range.
  let rangeStart: string | null = null;
  let rangeEnd: string | null = null;

  if (program.startDate) rangeStart = program.startDate;
  if (program.endDate) rangeEnd = program.endDate;

  if (!rangeStart || !rangeEnd) {
    const sessionDates = sessions.map((s) => s.session.date);
    if (sessionDates.length > 0) {
      rangeStart = rangeStart ?? sessionDates.reduce((min, d) => (d < min ? d : min));
      rangeEnd = rangeEnd ?? sessionDates.reduce((max, d) => (d > max ? d : max));
    }
  }

  if (!rangeStart || !rangeEnd) {
    // No dates + no sessions — return just current week.
    const monday = weekStartOf(today, "monday");
    return {
      weeks: [
        {
          idx: 1,
          monday,
          sunday: addDays(monday, 6),
          sessions: [],
          isCurrent: true,
          isPast: false,
        },
      ],
      currentWeekIdx: 1,
      totalWeeks: 1,
    };
  }

  // Snap start to its monday, end to its sunday. Include today's week if today
  // falls after program endDate (so user can navigate back easily).
  const firstMonday = weekStartOf(rangeStart, "monday");
  const lastMondayOfRange = weekStartOf(rangeEnd, "monday");
  const finalMonday =
    today > rangeEnd ? weekStartOf(today, "monday") : lastMondayOfRange;

  // Also allow user to scroll ONE week before the first monday (in case they
  // want to see a pre-program prep week). Skip if it lands before today - 12mo.
  const startMonday = firstMonday;

  // Group sessions by their week's monday.
  const sessionsByMonday = new Map<string, HydratedSession[]>();
  for (const s of sessions) {
    const monday = weekStartOf(s.session.date, "monday");
    if (!sessionsByMonday.has(monday)) sessionsByMonday.set(monday, []);
    sessionsByMonday.get(monday)!.push(s);
  }

  const weeks: ProgramWeek[] = [];
  const todaysMonday = weekStartOf(today, "monday");
  let cursor = startMonday;
  let idx = 1;
  while (cursor <= finalMonday) {
    const sunday = addDays(cursor, 6);
    weeks.push({
      idx,
      monday: cursor,
      sunday,
      sessions: sessionsByMonday.get(cursor) ?? [],
      isCurrent: cursor === todaysMonday,
      isPast: sunday < today,
    });
    cursor = addDays(cursor, 7);
    idx += 1;
  }

  // Also insert sessions that fell OUTSIDE the computed range (defensive: user
  // may have sessions dated after endDate). Extra weeks appended at end.
  const outsideMondays = [...sessionsByMonday.keys()].filter(
    (m) => !weeks.some((w) => w.monday === m),
  );
  for (const monday of outsideMondays.sort()) {
    weeks.push({
      idx: weeks.length + 1,
      monday,
      sunday: addDays(monday, 6),
      sessions: sessionsByMonday.get(monday) ?? [],
      isCurrent: monday === todaysMonday,
      isPast: addDays(monday, 6) < today,
    });
  }

  const currentIdx = weeks.find((w) => w.isCurrent)?.idx ?? null;
  return {
    weeks,
    currentWeekIdx: currentIdx,
    totalWeeks: weeks.length,
  };
}

// Human countdown from today to target date. Positive → future, negative → past.
export function fmtCountdown(fromDate: string, targetDate: string): string {
  const [fy, fm, fd] = fromDate.split("-").map(Number);
  const [ty, tm, td] = targetDate.split("-").map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  const diff = Math.round((to - from) / (1000 * 60 * 60 * 24));

  if (diff === 0) return "hari ini";
  if (diff === 1) return "besok";
  if (diff === -1) return "kemarin";
  if (diff > 0 && diff <= 6) return `${diff} hari lagi`;
  if (diff < 0 && diff >= -6) return `${Math.abs(diff)} hari lalu`;
  if (diff > 0 && diff <= 30) return `${diff} hari lagi`;
  if (diff < 0 && diff >= -30) return `${Math.abs(diff)} hari lalu`;
  if (diff > 0) return `${Math.round(diff / 7)} minggu lagi`;
  return `${Math.round(Math.abs(diff) / 7)} minggu lalu`;
}

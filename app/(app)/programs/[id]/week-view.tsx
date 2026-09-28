"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteSessionAction,
  duplicateSessionAction,
} from "@/app/actions";
import type { HydratedSession } from "@/lib/services/stats";
import type { ProgramWeek } from "@/lib/utils/program-weeks";
import { addDays, toIsoDate } from "@/lib/utils/dates";
import {
  fmtDistance,
  fmtDurationRange,
  fmtHari,
  fmtSessionType,
  fmtSport,
  fmtTanggalPendek,
  isToday as isTodayFn,
  SPORT_STYLES,
} from "@/lib/utils/format";
import { fmtCountdown } from "@/lib/utils/program-weeks";

type Phase = { id: string; name: string; startDate: string; endDate: string };

type Props = {
  programId: string;
  weeks: ProgramWeek[];
  initialWeekIdx: number;
  phases: Phase[];
};

export function WeekView({ programId, weeks, initialWeekIdx, phases }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(initialWeekIdx);
  const tabsRef = useRef<HTMLDivElement>(null);
  const today = toIsoDate(new Date());

  // Auto-scroll tabs so current week is in view on mount.
  useEffect(() => {
    const container = tabsRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>('[data-active="true"]');
    if (active) {
      active.scrollIntoView({ block: "nearest", inline: "center", behavior: "instant" });
    }
  }, []);

  const week = weeks.find((w) => w.idx === selectedIdx) ?? weeks[0];
  const days = Array.from({ length: 7 }, (_, i) => addDays(week.monday, i));

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div
        ref={tabsRef}
        className="sticky top-0 z-10 -mx-4 flex gap-1.5 overflow-x-auto border-b border-zinc-200 bg-white/95 px-4 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"
      >
        {weeks.map((w) => {
          const active = w.idx === selectedIdx;
          return (
            <button
              key={w.idx}
              type="button"
              data-active={active}
              onClick={() => setSelectedIdx(w.idx)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                active
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : w.isCurrent
                    ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                    : w.isPast
                      ? "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              W{w.idx}
              {w.isCurrent ? " •" : ""}
            </button>
          );
        })}
      </div>

      {/* Week header */}
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">
            Minggu {week.idx} — {fmtTanggalPendek(week.monday)} sd {fmtTanggalPendek(week.sunday)}
          </h2>
          <p className="text-xs text-zinc-500">
            {week.sessions.length} sesi
            {week.isCurrent
              ? " · minggu ini"
              : week.isPast
                ? " · lampau"
                : ` · ${fmtCountdown(today, week.monday)}`}
          </p>
        </div>
        <Link
          href={`/sessions/new?programId=${programId}&date=${week.monday}`}
          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          + Sesi
        </Link>
      </header>

      {/* Days list */}
      <ul className="space-y-3">
        {days.map((d) => {
          const daySessions = week.sessions.filter((s) => s.session.date === d);
          const isDayToday = isTodayFn(d);
          const phase = phases.find((p) => d >= p.startDate && d <= p.endDate);
          return (
            <li
              key={d}
              className={`rounded-lg border p-3 ${
                isDayToday
                  ? "border-zinc-900 dark:border-zinc-100"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      isDayToday ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
                    }`}
                  >
                    {fmtHari(d)}
                  </span>
                  <span className="text-xs text-zinc-500">{fmtTanggalPendek(d)}</span>
                  <span className="text-[10px] text-zinc-400">· {fmtCountdown(today, d)}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  {phase ? (
                    <span className="rounded-full bg-indigo-100 px-1.5 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                      {phase.name}
                    </span>
                  ) : null}
                  {daySessions.length === 0 ? (
                    <Link
                      href={`/sessions/new?programId=${programId}&date=${d}`}
                      className="text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      + Sesi
                    </Link>
                  ) : null}
                </div>
              </div>

              {daySessions.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">Kosong</p>
              ) : (
                <ul className="space-y-2">
                  {daySessions.map((s) => (
                    <DaySessionCard
                      key={s.session.id}
                      session={s}
                      currentDate={d}
                    />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DaySessionCard({
  session: s,
  currentDate,
}: {
  session: HydratedSession;
  currentDate: string;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const doneStyle =
    s.session.status === "done"
      ? "opacity-70"
      : s.session.status === "skipped"
        ? "opacity-50 line-through decoration-zinc-400"
        : "";

  const onDuplicate = () => {
    const nextWeek = addDays(currentDate, 7);
    setMenuOpen(false);
    start(async () => {
      setErr(null);
      setMsg(null);
      const res = await duplicateSessionAction(s.session.id, nextWeek);
      if (res.ok) {
        setMsg(`→ ${nextWeek}`);
        router.refresh();
        setTimeout(() => setMsg(null), 3000);
      } else setErr(res.error.message);
    });
  };

  const onDelete = () => {
    setMenuOpen(false);
    if (!confirm("Hapus sesi ini?")) return;
    start(async () => {
      setErr(null);
      const res = await deleteSessionAction(s.session.id);
      if (res.ok) router.refresh();
      else setErr(res.error.message);
    });
  };

  return (
    <li
      className={`relative rounded-md border border-zinc-200 p-2.5 text-xs dark:border-zinc-800 ${doneStyle}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex rounded-full px-1.5 text-[10px] font-medium ${SPORT_STYLES[s.session.sport] ?? SPORT_STYLES.other}`}
            >
              {fmtSport(s.session.sport)}
            </span>
            {fmtSessionType(s.session.sessionType) ? (
              <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                {fmtSessionType(s.session.sessionType)}
              </span>
            ) : null}
            {s.session.status !== "planned" ? (
              <span className="text-[10px] uppercase text-zinc-500">
                · {s.session.status}
              </span>
            ) : null}
          </div>
          <p className="mt-1 font-medium">
            {s.session.title ?? fmtSport(s.session.sport)}
          </p>
          {(s.session.targetDurationMinSec ||
            s.session.targetDurationMaxSec ||
            s.session.targetDistanceM ||
            s.session.targetIntensity) && (
            <p className="mt-0.5 text-zinc-500">
              {s.session.targetDurationMinSec || s.session.targetDurationMaxSec
                ? fmtDurationRange(s.session.targetDurationMinSec, s.session.targetDurationMaxSec)
                : ""}
              {s.session.targetDistanceM ? ` · ${fmtDistance(s.session.targetDistanceM)}` : ""}
              {s.session.targetIntensity ? ` · ${s.session.targetIntensity}` : ""}
            </p>
          )}
          {s.blocks.length > 0 ? (
            <p className="mt-0.5 text-[10px] text-zinc-400">
              {s.blocks
                .map((b) => `${b.block.name ?? "Block"}${b.block.rounds > 1 ? `×${b.block.rounds}` : ""}: ${b.items.map((i) => i.name).slice(0, 2).join(", ")}${b.items.length > 2 ? "..." : ""}`)
                .join(" | ")}
            </p>
          ) : null}
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Menu sesi"
          >
            ⋮
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
              <Link
                href={`/sessions/${s.session.id}`}
                className="block px-3 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
                onClick={() => setMenuOpen(false)}
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={onDuplicate}
                disabled={pending}
                className="block w-full px-3 py-2 text-left text-xs hover:bg-zinc-50 disabled:opacity-60 dark:hover:bg-zinc-800"
              >
                Duplicate ke minggu depan
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={pending}
                className="block w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-950/30"
              >
                Hapus
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {msg ? <p className="mt-1 text-[10px] text-green-600">✓ {msg}</p> : null}
      {err ? <p className="mt-1 text-[10px] text-red-600">{err}</p> : null}
    </li>
  );
}

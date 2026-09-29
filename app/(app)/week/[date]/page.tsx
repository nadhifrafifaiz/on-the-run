import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  activitiesByDate,
  hydratedSessions,
  weeklySummary,
} from "@/lib/services/stats";
import { getWeekNote } from "@/lib/services/week-notes";
import { getProfile } from "@/lib/services/profiles";
import { addDays, todayInTz, weekStartOf } from "@/lib/utils/dates";
import {
  fmtDistance,
  fmtHari,
  fmtTanggalPendek,
  fmtTanggalLengkap,
} from "@/lib/utils/format";
import { SessionCard } from "../../_components/session-card";
import { DuplicateWeekButton } from "./duplicate-week-button";

type Params = Promise<{ date: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }) {
  const { date } = await params;
  return { title: `Minggu ${date} · on-the-run` };
}

export default async function WeekPage({ params }: { params: Params }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { date } = await params;
  const weekStart = weekStartOf(date, "monday");
  const weekEnd = addDays(weekStart, 6);
  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  const [sessions, activities, summary, note, profile] = await Promise.all([
    hydratedSessions(user.id, weekStart, weekEnd),
    activitiesByDate(user.id, weekStart, weekEnd),
    weeklySummary(user.id, weekStart),
    getWeekNote(user.id, weekStart),
    getProfile(user.id),
  ]);
  const today = todayInTz(profile?.timezone ?? "Asia/Jakarta");

  // Group sessions by ISO date.
  const sessionsByDate = new Map<string, typeof sessions>();
  for (const s of sessions) {
    if (!sessionsByDate.has(s.session.date)) sessionsByDate.set(s.session.date, []);
    sessionsByDate.get(s.session.date)!.push(s);
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Minggu</p>
          <h1 className="text-xl font-semibold tracking-tight">
            {fmtTanggalLengkap(weekStart)} – {fmtTanggalLengkap(weekEnd)}
          </h1>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <Link
            href={`/week/${prevWeek}`}
            className="rounded-md border border-zinc-200 px-2.5 py-1 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            ← Sebelumnya
          </Link>
          <Link
            href={`/week/${nextWeek}`}
            className="rounded-md border border-zinc-200 px-2.5 py-1 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            Selanjutnya →
          </Link>
        </div>
      </header>

      {/* Weekly summary */}
      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-zinc-500">Sesi selesai</dt>
            <dd className="mt-0.5 font-semibold">
              {summary.sessionsDone}
              <span className="text-zinc-400"> / {summary.sessionsPlanned}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Km lari</dt>
            <dd className="mt-0.5 font-semibold">{summary.runDistanceKm.toFixed(1)}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Durasi total</dt>
            <dd className="mt-0.5 font-semibold">{summary.totalDurationMin} m</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Rata-rata RPE</dt>
            <dd className="mt-0.5 font-semibold">{summary.avgRpe ?? "—"}</dd>
          </div>
        </dl>
      </section>

      {/* Week notes */}
      {note && (note.context || (note.principles && note.principles.length > 0)) ? (
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Catatan minggu
          </h2>
          {note.context ? <p className="text-sm">{note.context}</p> : null}
          {note.principles && note.principles.length > 0 ? (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-zinc-600 dark:text-zinc-400">
              {note.principles.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {/* 7-day list */}
      <section className="space-y-3">
        {days.map((d) => {
          const daySessions = sessionsByDate.get(d) ?? [];
          const dayActivities = activities.get(d) ?? [];
          const isDayToday = d === today;
          return (
            <div
              key={d}
              className={`rounded-lg border p-3 ${
                isDayToday
                  ? "border-zinc-900 dark:border-zinc-100"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div className="mb-2 flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider ${isDayToday ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}
                  >
                    {fmtHari(d)}
                  </span>
                  <span className="text-xs text-zinc-500">{fmtTanggalPendek(d)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isDayToday ? (
                    <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-white dark:bg-white dark:text-zinc-900">
                      Hari ini
                    </span>
                  ) : null}
                  <Link
                    href={`/sessions/new?date=${d}`}
                    className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    + Sesi
                  </Link>
                </div>
              </div>

              {daySessions.length === 0 && dayActivities.length === 0 ? (
                <p className="text-xs text-zinc-500">Kosong</p>
              ) : (
                <div className="space-y-2">
                  {daySessions.map((s) => (
                    <SessionCard key={s.session.id} data={s} compact />
                  ))}
                  {dayActivities.length > 0 ? (
                    <ul className="space-y-1">
                      {dayActivities.map((a) => (
                        <li
                          key={a.id}
                          className="rounded-md border border-emerald-200 bg-emerald-50/40 px-3 py-2 text-xs dark:border-emerald-900/40 dark:bg-emerald-950/20"
                        >
                          <span className="font-medium">✓ {a.title ?? a.sport}</span>
                          <span className="ml-2 text-zinc-500">
                            {fmtDistance(a.distanceM)} · {a.durationSec ? `${Math.round(a.durationSec / 60)}m` : "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm dark:border-zinc-700">
        <p className="mb-2 font-medium">Duplikasi minggu ini ke minggu berikutnya</p>
        <p className="mb-3 text-xs text-zinc-500">
          Menyalin semua sesi + block + item dari minggu ini ke minggu {fmtTanggalPendek(nextWeek)}.
          Status disetel ulang ke <em>planned</em>.
        </p>
        <DuplicateWeekButton from={weekStart} to={nextWeek} />
      </section>
    </div>
  );
}

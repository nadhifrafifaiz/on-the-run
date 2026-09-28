import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hydratedSessions, weeklySummary, activitiesByDate } from "@/lib/services/stats";
import { listPending } from "@/lib/services/drafts";
import { toIsoDate, weekStartOf } from "@/lib/utils/dates";
import { fmtDistance, fmtHari, fmtTanggalLengkap } from "@/lib/utils/format";
import { SessionCard } from "../_components/session-card";
import { EmptyState } from "@/app/_components/empty-state";

export const metadata = { title: "Hari ini · on-the-run" };
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = toIsoDate(new Date());
  const monday = weekStartOf(today, "monday");

  const [sessions, summary, activities, drafts] = await Promise.all([
    hydratedSessions(user.id, today, today),
    weeklySummary(user.id, monday),
    activitiesByDate(user.id, today, today),
    listPending(user.id),
  ]);

  const todaysActivities = activities.get(today) ?? [];

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {fmtHari(today, true)}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{fmtTanggalLengkap(today)}</h1>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={`/sessions/new?date=${today}`}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            + Sesi
          </Link>
          <Link
            href="/log/new"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            + Log aktivitas
          </Link>
        </div>
      </header>

      {drafts.length > 0 ? (
        <Link
          href={`/log/review/${drafts[0].id}`}
          className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/30"
        >
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-200">
              {drafts.length} draft menunggu review
            </p>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
              Cek dan simpan sebelum kedaluwarsa
            </p>
          </div>
          <span className="text-amber-900 dark:text-amber-200">→</span>
        </Link>
      ) : null}

      {/* Weekly summary card */}
      <section
        aria-labelledby="ringkasan-mingguan"
        className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <h2
          id="ringkasan-mingguan"
          className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500"
        >
          Minggu ini
        </h2>
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
            <dt className="text-xs text-zinc-500">Durasi</dt>
            <dd className="mt-0.5 font-semibold">{summary.totalDurationMin} m</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Rata-rata RPE</dt>
            <dd className="mt-0.5 font-semibold">{summary.avgRpe ?? "—"}</dd>
          </div>
        </dl>
        <Link
          href={`/week/${monday}`}
          className="mt-3 inline-block text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Lihat minggu lengkap →
        </Link>
      </section>

      {/* Sesi hari ini */}
      <section aria-labelledby="sesi">
        <h2 id="sesi" className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Sesi hari ini
        </h2>
        {sessions.length === 0 ? (
          <EmptyState
            title="Belum ada sesi terjadwal hari ini."
            hint="Tap + Sesi di atas untuk tambah manual, atau aktifkan program dengan planned session."
          />
        ) : (
          <ul className="space-y-3">
            {sessions.map((s) => (
              <li key={s.session.id}>
                <SessionCard data={s} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Aktivitas hari ini */}
      {todaysActivities.length > 0 ? (
        <section aria-labelledby="aktivitas">
          <h2
            id="aktivitas"
            className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500"
          >
            Aktivitas tercatat
          </h2>
          <ul className="space-y-2">
            {todaysActivities.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{a.title ?? a.sport}</span>
                  <span className="text-xs text-zinc-500">
                    {fmtDistance(a.distanceM)} · {a.durationSec ? `${Math.round(a.durationSec / 60)}m` : "—"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

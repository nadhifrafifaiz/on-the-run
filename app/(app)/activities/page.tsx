import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listActivities } from "@/lib/services/activities";
import { EmptyState } from "@/app/_components/empty-state";
import {
  fmtDistance,
  fmtDuration,
  fmtHari,
  fmtSport,
  fmtTanggalPendek,
  SPORT_STYLES,
} from "@/lib/utils/format";

export const metadata = { title: "Aktivitas · on-the-run" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ sport?: string }>;

const SPORT_FILTERS = [
  { value: "", label: "Semua" },
  { value: "run", label: "Lari" },
  { value: "strength", label: "Strength" },
  { value: "hiit", label: "HIIT" },
  { value: "cycling", label: "Sepeda" },
  { value: "swim", label: "Renang" },
  { value: "other", label: "Lainnya" },
];

export default async function ActivitiesPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { sport } = await searchParams;
  const activities = await listActivities(user.id, {
    sport: sport && sport !== "" ? sport : undefined,
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Aktivitas</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {activities.length} tercatat
          </h1>
        </div>
        <Link
          href="/log/new"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + Log baru
        </Link>
      </header>

      {/* Sport filter chips */}
      <nav aria-label="Filter sport" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-1.5">
          {SPORT_FILTERS.map((f) => {
            const active = (sport ?? "") === f.value;
            return (
              <li key={f.value}>
                <Link
                  href={f.value ? `/activities?sport=${f.value}` : "/activities"}
                  className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                    active
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  }`}
                >
                  {f.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {activities.length === 0 ? (
        <EmptyState title="Belum ada aktivitas untuk filter ini." />
      ) : (
        <ul className="space-y-2">
          {activities.map((a) => (
            <li key={a.id}>
              <Link
                href={`/activities/${a.id}`}
                className="block rounded-lg border border-zinc-200 p-3 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${SPORT_STYLES[a.sport] ?? SPORT_STYLES.other}`}
                      >
                        {fmtSport(a.sport)}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {fmtHari(a.date)} · {fmtTanggalPendek(a.date)}
                      </span>
                    </div>
                    <p className="mt-1 truncate font-medium">{a.title ?? fmtSport(a.sport)}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-zinc-500">
                    <div>{fmtDistance(a.distanceM)}</div>
                    <div>{fmtDuration(a.durationSec)}</div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

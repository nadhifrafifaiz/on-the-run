import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRace } from "@/lib/services/races";
import { fmtDistance, fmtDuration, fmtTanggalLengkap } from "@/lib/utils/format";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "Race · on-the-run" };
}

export default async function RaceDetailPage({ params }: { params: Params }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const race = await getRace(user.id, id);
  if (!race) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/races"
        className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        ← Semua race
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {race.status}
            </span>
            {race.distanceLabel ? (
              <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                {race.distanceLabel}
              </span>
            ) : null}
          </div>
          <Link
            href={`/races/${race.id}/edit`}
            className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Edit
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{race.name}</h1>
        <p className="text-sm text-zinc-500">
          {fmtTanggalLengkap(race.date)}
          {race.location ? ` · ${race.location}` : ""}
        </p>
      </header>

      {/* Times & result */}
      {(race.chipTimeSec || race.watchTimeSec || race.targetTimeSec || race.distanceM) && (
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {race.chipTimeSec ? (
              <Metric label="Chip time" value={fmtDuration(race.chipTimeSec)} />
            ) : null}
            {race.watchTimeSec ? (
              <Metric label="Watch time" value={fmtDuration(race.watchTimeSec)} />
            ) : null}
            {race.targetTimeSec ? (
              <Metric label="Target" value={fmtDuration(race.targetTimeSec)} />
            ) : null}
            {race.distanceM ? <Metric label="Jarak" value={fmtDistance(race.distanceM)} /> : null}
          </dl>
        </section>
      )}

      {/* Rankings */}
      {(race.rankOverall || race.rankGender || race.rankCategory) && (
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Peringkat
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {race.rankOverall ? (
              <Metric
                label="Overall"
                value={`${race.rankOverall}${race.totalOverall ? ` / ${race.totalOverall}` : ""}`}
              />
            ) : null}
            {race.rankGender ? (
              <Metric
                label="Gender"
                value={`${race.rankGender}${race.totalGender ? ` / ${race.totalGender}` : ""}`}
              />
            ) : null}
            {race.rankCategory ? (
              <Metric
                label="Kategori"
                value={`${race.rankCategory}${race.totalCategory ? ` / ${race.totalCategory}` : ""}`}
              />
            ) : null}
          </dl>
        </section>
      )}

      {/* Strategy */}
      {race.strategy ? (
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Strategi / catatan
          </h2>
          <p className="whitespace-pre-wrap text-sm">{race.strategy}</p>
        </section>
      ) : null}

      {/* Linked activity */}
      {race.activityId ? (
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">Aktivitas tertaut</p>
          <Link
            href={`/activities/${race.activityId}`}
            className="mt-1 inline-block text-sm font-medium underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-500"
          >
            Buka detail aktivitas →
          </Link>
        </section>
      ) : null}

      {/* Race report (markdown) */}
      {race.report ? (
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Race report
          </h2>
          <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
            {race.report}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}

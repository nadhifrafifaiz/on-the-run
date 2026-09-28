import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getHydratedActivity } from "@/lib/services/activities";
import {
  fmtDistance,
  fmtDuration,
  fmtHr,
  fmtPace,
  fmtSessionType,
  fmtSport,
  fmtTanggalLengkap,
  SPORT_STYLES,
} from "@/lib/utils/format";
import { DeleteActivityButton } from "./delete-activity-button";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "Aktivitas · on-the-run" };
}

export default async function ActivityDetailPage({ params }: { params: Params }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const data = await getHydratedActivity(user.id, id);
  if (!data) notFound();

  const { activity, runMetrics: rm, items } = data;
  const zone = activity.zoneSnapshot as {
    max_hr?: number;
    resting_hr?: number;
    lthr?: number;
    hr_zones?: Record<string, { min: number; max: number }>;
  } | null;

  const feelLabel: Record<string, string> = {
    great: "Great",
    good: "Good",
    okay: "Okay",
    tough: "Tough",
    bad: "Bad",
  };

  return (
    <div className="space-y-6">
      <Link
        href="/activities"
        className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        ← Semua aktivitas
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${SPORT_STYLES[activity.sport] ?? SPORT_STYLES.other}`}
          >
            {fmtSport(activity.sport)}
          </span>
          {fmtSessionType(activity.sessionType) ? (
            <span className="text-[10px] uppercase tracking-wide text-zinc-500">
              {fmtSessionType(activity.sessionType)}
            </span>
          ) : null}
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">
            · source: {activity.source}
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {activity.title ?? fmtSport(activity.sport)}
        </h1>
        <p className="text-sm text-zinc-500">{fmtTanggalLengkap(activity.date)}</p>
      </header>

      {/* Primary metrics grid */}
      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Metric label="Durasi" value={fmtDuration(activity.durationSec)} />
          <Metric label="Jarak" value={fmtDistance(activity.distanceM)} />
          <Metric label="Avg HR" value={fmtHr(activity.avgHr)} />
          <Metric label="Max HR" value={fmtHr(activity.maxHr)} />
          <Metric
            label="RPE"
            value={activity.rpe != null ? `${activity.rpe} / 10` : "—"}
          />
          <Metric
            label="Feel"
            value={activity.feel ? feelLabel[activity.feel] ?? activity.feel : "—"}
          />
          {activity.calories != null ? (
            <Metric label="Kalori" value={String(activity.calories)} />
          ) : null}
          {activity.trainingLoad != null ? (
            <Metric label="Training Load" value={String(activity.trainingLoad)} />
          ) : null}
        </dl>
      </section>

      {/* Run-specific metrics */}
      {rm ? (
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Detail lari
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Metric label="Avg Pace" value={fmtPace(rm.avgPaceSecPerKm)} />
            {rm.cadenceSpm != null ? (
              <Metric label="Cadence" value={`${rm.cadenceSpm} spm`} />
            ) : null}
            {rm.strideLengthM ? <Metric label="Stride" value={`${rm.strideLengthM} m`} /> : null}
            {rm.gctAvgMs != null ? <Metric label="GCT avg" value={`${rm.gctAvgMs} ms`} /> : null}
            {rm.gctMinMs != null ? <Metric label="GCT min" value={`${rm.gctMinMs} ms`} /> : null}
            {rm.balanceLeftPct && rm.balanceRightPct ? (
              <Metric label="Balance L/R" value={`${rm.balanceLeftPct} / ${rm.balanceRightPct}`} />
            ) : null}
            {rm.vo2max ? <Metric label="VO2max" value={String(rm.vo2max)} /> : null}
            {rm.elevationGainM != null ? (
              <Metric label="Elevasi" value={`${rm.elevationGainM} m`} />
            ) : null}
          </dl>
        </section>
      ) : null}

      {/* Items + sets */}
      {items.length > 0 ? (
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Gerakan & set
          </h2>
          <ul className="space-y-3">
            {items.map(({ item, sets }) => (
              <li key={item.id}>
                <div className="flex items-baseline gap-2">
                  <span className="font-medium">{item.name}</span>
                  {item.blockName ? (
                    <span className="text-xs text-zinc-500">· {item.blockName}</span>
                  ) : null}
                </div>
                {sets.length > 0 ? (
                  <ol className="mt-1 space-y-0.5 pl-3 text-xs text-zinc-600 dark:text-zinc-400">
                    {sets.map((s) => (
                      <li key={s.id} className="flex flex-wrap gap-x-2">
                        <span className="text-zinc-500">Set {s.setNumber}:</span>
                        {s.reps ? <span>{s.reps} reps</span> : null}
                        {s.loadKg ? <span>{s.loadKg} kg</span> : null}
                        {s.durationSec ? <span>{fmtDuration(s.durationSec)}</span> : null}
                        {s.distanceM ? <span>{fmtDistance(s.distanceM)}</span> : null}
                        {s.status !== "done" ? (
                          <span className="text-amber-700 dark:text-amber-300">· {s.status}</span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Zone snapshot */}
      {zone && (zone.max_hr || zone.hr_zones) ? (
        <section className="rounded-lg border border-zinc-200 p-4 text-xs dark:border-zinc-800">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Zona saat aktivitas
          </h2>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {zone.max_hr ? <Metric label="Max HR" value={`${zone.max_hr} bpm`} small /> : null}
            {zone.lthr ? <Metric label="LTHR" value={`${zone.lthr} bpm`} small /> : null}
            {zone.resting_hr ? (
              <Metric label="Resting HR" value={`${zone.resting_hr} bpm`} small />
            ) : null}
          </dl>
          {zone.hr_zones ? (
            <ul className="mt-2 space-y-0.5 text-zinc-500">
              {Object.entries(zone.hr_zones).map(([z, r]) => (
                <li key={z}>
                  <span className="uppercase">{z}</span>: {r.min}–{r.max} bpm
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {/* Notes */}
      {activity.notes ? (
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Catatan
          </h2>
          <p className="whitespace-pre-wrap text-sm">{activity.notes}</p>
        </section>
      ) : null}

      {activity.coachNotes ? (
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Coach notes
          </h2>
          <p className="whitespace-pre-wrap text-sm">{activity.coachNotes}</p>
        </section>
      ) : null}

      <div className="flex items-center gap-4 pt-2">
        <Link
          href={`/activities/${activity.id}/edit`}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Edit aktivitas
        </Link>
        <DeleteActivityButton id={activity.id} />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  small = false,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className={`mt-0.5 ${small ? "text-xs" : ""} font-semibold`}>{value}</dd>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listRaces } from "@/lib/services/races";
import { bestEfforts } from "@/lib/services/stats";
import { getProfile } from "@/lib/services/profiles";
import { fmtDuration, fmtTanggalPendek } from "@/lib/utils/format";
import { todayInTz } from "@/lib/utils/dates";

export const metadata = { title: "Race · on-the-run" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  planned: "Rencana",
  done: "Selesai",
  dns: "DNS",
  dnf: "DNF",
};

const STATUS_STYLE: Record<string, string> = {
  planned: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  done: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300",
  dns: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
  dnf: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
};

export default async function RacesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [races, prs, profile] = await Promise.all([
    listRaces(user.id),
    bestEfforts(user.id),
    getProfile(user.id),
  ]);
  const today = todayInTz(profile?.timezone ?? "Asia/Jakarta");
  const upcoming = races.filter((r) => r.date >= today && r.status === "planned");
  const past = races.filter((r) => r.date < today || r.status !== "planned");

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Race</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {races.length} race{races.length === 1 ? "" : "s"}
          </h1>
        </div>
        <Link
          href="/races/new"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + Race baru
        </Link>
      </header>

      {/* Best Efforts */}
      <section
        aria-labelledby="pr"
        className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <h2 id="pr" className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Best Efforts
        </h2>
        {prs.length === 0 ? (
          <p className="text-sm text-zinc-500">Belum ada PR — mulai log race atau tandai effort.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {prs.map((p) => (
              <div key={p.distanceLabel}>
                <dt className="text-xs text-zinc-500">{p.distanceLabel}</dt>
                <dd className="mt-0.5 font-semibold">{fmtDuration(p.timeSec)}</dd>
                <dd className="text-[10px] text-zinc-400">
                  {p.source === "race" ? "race" : "effort"} · {fmtTanggalPendek(p.date)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* Upcoming */}
      {upcoming.length > 0 ? (
        <section aria-labelledby="upcoming">
          <h2
            id="upcoming"
            className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500"
          >
            Mendatang
          </h2>
          <ul className="space-y-2">
            {upcoming.map((r) => (
              <RaceRow key={r.id} race={r} />
            ))}
          </ul>
        </section>
      ) : null}

      {/* Past */}
      {past.length > 0 ? (
        <section aria-labelledby="past">
          <h2 id="past" className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Riwayat
          </h2>
          <ul className="space-y-2">
            {past.map((r) => (
              <RaceRow key={r.id} race={r} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function RaceRow({
  race,
}: {
  race: {
    id: string;
    name: string;
    date: string;
    distanceLabel: string | null;
    chipTimeSec: number | null;
    status: string;
  };
}) {
  return (
    <li>
      <Link
        href={`/races/${race.id}`}
        className="block rounded-lg border border-zinc-200 p-3 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[race.status] ?? STATUS_STYLE.planned}`}
              >
                {STATUS_LABEL[race.status] ?? race.status}
              </span>
              {race.distanceLabel ? (
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                  {race.distanceLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate font-medium">{race.name}</p>
            <p className="text-xs text-zinc-500">{fmtTanggalPendek(race.date)}</p>
          </div>
          {race.chipTimeSec ? (
            <span className="shrink-0 text-right text-sm font-semibold">
              {fmtDuration(race.chipTimeSec)}
            </span>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

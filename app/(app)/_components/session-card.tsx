import Link from "next/link";
import type { HydratedSession } from "@/lib/services/stats";
import {
  fmtDistance,
  fmtDuration,
  fmtDurationRange,
  fmtSessionType,
  fmtSport,
  SPORT_STYLES,
} from "@/lib/utils/format";

type Props = {
  data: HydratedSession;
  compact?: boolean;
  hideEdit?: boolean;
  phaseName?: string | null; // e.g. "Base", "Build" — shown as small chip
};

export function SessionCard({ data, compact = false, hideEdit = false, phaseName }: Props) {
  const { session, programName, blocks } = data;
  const doneStyle =
    session.status === "done"
      ? "opacity-70"
      : session.status === "skipped"
        ? "opacity-50 line-through decoration-zinc-400"
        : "";

  return (
    <article
      className={`rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 ${doneStyle}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${SPORT_STYLES[session.sport] ?? SPORT_STYLES.other}`}
            >
              {fmtSport(session.sport)}
            </span>
            {fmtSessionType(session.sessionType) ? (
              <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                {fmtSessionType(session.sessionType)}
              </span>
            ) : null}
            {session.status !== "planned" ? (
              <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                · {session.status === "done" ? "Selesai" : session.status === "skipped" ? "Dilewati" : "Diubah"}
              </span>
            ) : null}
          </div>
          <h3 className="mt-1 truncate font-semibold">
            {session.title ?? fmtSport(session.sport)}
          </h3>
          {programName ? (
            <p className="text-xs text-zinc-500">
              {programName}
              {phaseName ? (
                <>
                  {" · "}
                  <span className="inline-flex rounded-full bg-indigo-100 px-1.5 py-0 text-[10px] font-medium text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                    {phaseName}
                  </span>
                </>
              ) : null}
            </p>
          ) : (
            <p className="text-xs italic text-zinc-400">Sesi lepas (tanpa program)</p>
          )}
        </div>
        {!hideEdit ? (
          <Link
            href={`/sessions/${session.id}`}
            className="shrink-0 text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Edit
          </Link>
        ) : null}
      </header>

      {session.description ? (
        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{session.description}</p>
      ) : null}

      {(session.targetDurationMinSec ||
        session.targetDurationMaxSec ||
        session.targetDistanceM ||
        session.targetIntensity) && (
        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {session.targetDurationMinSec || session.targetDurationMaxSec ? (
            <div>
              <dt className="inline text-zinc-500">Durasi: </dt>
              <dd className="inline font-medium">
                {fmtDurationRange(session.targetDurationMinSec, session.targetDurationMaxSec)}
              </dd>
            </div>
          ) : null}
          {session.targetDistanceM ? (
            <div>
              <dt className="inline text-zinc-500">Jarak: </dt>
              <dd className="inline font-medium">{fmtDistance(session.targetDistanceM)}</dd>
            </div>
          ) : null}
          {session.targetIntensity ? (
            <div>
              <dt className="inline text-zinc-500">Intensitas: </dt>
              <dd className="inline font-medium">{session.targetIntensity}</dd>
            </div>
          ) : null}
        </dl>
      )}

      {!compact && blocks.length > 0 ? (
        <ul className="mt-3 space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          {blocks.map(({ block, items }) => (
            <li key={block.id}>
              <div className="flex items-baseline gap-2 text-xs">
                <span className="font-medium">{block.name ?? "Block"}</span>
                {block.rounds > 1 ? (
                  <span className="text-zinc-500">× {block.rounds} ronde</span>
                ) : null}
              </div>
              {items.length > 0 ? (
                <ul className="mt-1 space-y-0.5 pl-3 text-xs text-zinc-600 dark:text-zinc-400">
                  {items.map((it) => (
                    <li key={it.id} className="flex flex-wrap gap-x-2">
                      <span className="text-zinc-900 dark:text-zinc-100">{it.name}</span>
                      {it.sets ? <span>{it.sets}×</span> : null}
                      {it.reps ? <span>{it.reps} reps</span> : null}
                      {it.durationSec ? <span>{fmtDuration(it.durationSec)}</span> : null}
                      {it.distanceM ? <span>{fmtDistance(it.distanceM)}</span> : null}
                      {it.loadKg ? <span>{it.loadKg} kg</span> : null}
                      {it.target ? <span className="text-zinc-500">· {it.target}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

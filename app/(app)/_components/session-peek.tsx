"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { HydratedSession } from "@/lib/services/stats";
import {
  fmtDistance,
  fmtDuration,
  fmtDurationRange,
  fmtSessionType,
  fmtSport,
} from "@/lib/utils/format";

type Props = {
  data: HydratedSession;
};

export function SessionPeek({ data }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const { session, programName, blocks } = data;
  const onClose = () => setOpen(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const hasTargets =
    session.targetDurationMinSec ||
    session.targetDurationMaxSec ||
    session.targetDistanceM ||
    session.targetIntensity;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1 text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        Lihat menu ↓
      </button>
      <dialog
        ref={ref}
        onClose={onClose}
        onClick={(e) => {
          if (e.target === ref.current) onClose();
        }}
        className="m-0 mt-auto w-full max-w-lg rounded-t-2xl p-0 backdrop:bg-black/40 sm:m-auto sm:rounded-2xl"
      >
        <div className="max-h-[80vh] overflow-y-auto bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
          <header className="sticky top-0 flex items-start justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] tracking-wide text-zinc-500 uppercase">
                  {fmtSport(session.sport)}
                </span>
                {fmtSessionType(session.sessionType) ? (
                  <span className="text-[10px] tracking-wide text-zinc-500 uppercase">
                    · {fmtSessionType(session.sessionType)}
                  </span>
                ) : null}
              </div>
              <h2 className="mt-0.5 truncate text-base font-semibold">
                {session.title ?? fmtSport(session.sport)}
              </h2>
              {programName ? <p className="text-xs text-zinc-500">{programName}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="shrink-0 rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              ✕
            </button>
          </header>

          <div className="space-y-4 px-4 py-3">
            {session.description ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{session.description}</p>
            ) : null}

            {hasTargets ? (
              <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
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
            ) : null}

            {blocks.length > 0 ? (
              <ul className="space-y-3">
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
                            {it.target ? (
                              <span className="text-zinc-500">· {it.target}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-zinc-500 italic">Belum ada rincian menu.</p>
            )}
          </div>

          <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Tutup
            </button>
            <Link
              href={`/sessions/${session.id}`}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Edit sesi →
            </Link>
          </footer>
        </div>
      </dialog>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPhaseAction,
  deletePhaseAction,
  updatePhaseAction,
} from "@/app/actions";
import { EmptyState } from "@/app/_components/empty-state";

type Phase = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  focus: string | null;
};

type Props = {
  programId: string;
  phases: Phase[];
};

export function PhasesSection({ programId, phases }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Fase ({phases.length})
        </h2>
        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            + Fase baru
          </button>
        ) : null}
      </div>

      {phases.length === 0 && !adding ? (
        <EmptyState
          title="Belum ada fase."
          hint="Tambah untuk struktur block (mis. Base 8 mgg, Build 6 mgg, Peak 3 mgg, Taper 2 mgg)."
        />
      ) : (
        <ul className="space-y-2">
          {phases.map((p) =>
            editingId === p.id ? (
              <li key={p.id}>
                <PhaseForm
                  mode="edit"
                  programId={programId}
                  phaseId={p.id}
                  initial={p}
                  onDone={() => setEditingId(null)}
                />
              </li>
            ) : (
              <PhaseRow
                key={p.id}
                phase={p}
                programId={programId}
                onEdit={() => setEditingId(p.id)}
              />
            ),
          )}
        </ul>
      )}

      {adding ? (
        <div className="mt-3">
          <PhaseForm
            mode="create"
            programId={programId}
            initial={{ name: "", startDate: "", endDate: "", focus: null }}
            onDone={() => setAdding(false)}
          />
        </div>
      ) : null}
    </section>
  );
}

function PhaseRow({
  phase,
  programId,
  onEdit,
}: {
  phase: Phase;
  programId: string;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{phase.name}</p>
          <p className="text-xs text-zinc-500">
            {phase.startDate} → {phase.endDate}
          </p>
          {phase.focus ? (
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{phase.focus}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-baseline gap-3 text-xs">
          <button
            type="button"
            onClick={onEdit}
            className="text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Edit
          </button>
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-red-600 underline underline-offset-4 hover:text-red-700"
            >
              Hapus
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await deletePhaseAction(phase.id, programId);
                    if (res.ok) router.refresh();
                  })
                }
                className="rounded-md bg-red-600 px-2 py-0.5 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {pending ? "…" : "Ya"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Batal
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function PhaseForm({
  mode,
  programId,
  phaseId,
  initial,
  onDone,
}: {
  mode: "create" | "edit";
  programId: string;
  phaseId?: string;
  initial: { name: string; startDate: string; endDate: string; focus: string | null };
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      action={(fd) =>
        start(async () => {
          setErr(null);
          const input = {
            programId,
            name: String(fd.get("name") ?? "").trim(),
            startDate: String(fd.get("startDate") ?? ""),
            endDate: String(fd.get("endDate") ?? ""),
            focus: String(fd.get("focus") ?? "").trim() || null,
          };
          const res =
            mode === "create"
              ? await createPhaseAction(input)
              : await updatePhaseAction(phaseId!, input);
          if (res.ok) {
            onDone();
            router.refresh();
          } else {
            setErr(res.error.message);
          }
        })
      }
      className="space-y-3 rounded-lg border border-zinc-300 p-3 dark:border-zinc-700"
    >
      <div>
        <label htmlFor="name" className="mb-1 block text-xs text-zinc-500">
          Nama fase
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={80}
          defaultValue={initial.name}
          placeholder="Base / Build / Peak / Taper / Phase 1"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="startDate" className="mb-1 block text-xs text-zinc-500">
            Mulai
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            defaultValue={initial.startDate}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="mb-1 block text-xs text-zinc-500">
            Selesai
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            required
            defaultValue={initial.endDate}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>
      <div>
        <label htmlFor="focus" className="mb-1 block text-xs text-zinc-500">
          Fokus (opsional)
        </label>
        <input
          id="focus"
          name="focus"
          maxLength={500}
          defaultValue={initial.focus ?? ""}
          placeholder="Build aerobic base, endurance up to 21km"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "…" : mode === "create" ? "Tambah fase" : "Simpan"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Batal
        </button>
        {err ? <span className="text-xs text-red-600">{err}</span> : null}
      </div>
    </form>
  );
}

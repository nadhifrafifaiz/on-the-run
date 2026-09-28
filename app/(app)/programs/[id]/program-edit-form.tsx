"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProgramAction } from "@/app/actions";
import type { ProgramInput } from "@/lib/schemas/forms";

type Initial = {
  name: string;
  type: "main" | "supporting";
  goal: string;
  startDate: string;
  endDate: string;
  notes: string;
};

function strOr(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export function ProgramEditForm({ programId, initial }: { programId: string; initial: Initial }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        Edit info program
      </button>
    );
  }

  return (
    <form
      action={(fd) =>
        start(async () => {
          setMsg(null);
          setErr(null);
          const input: Partial<ProgramInput> = {
            name: strOr(fd, "name") || initial.name,
            type: fd.get("type") as "main" | "supporting",
            goal: strOr(fd, "goal") || undefined,
            startDate: strOr(fd, "startDate") || undefined,
            endDate: strOr(fd, "endDate") || undefined,
            notes: strOr(fd, "notes") || undefined,
          };
          const res = await updateProgramAction(programId, input);
          if (res.ok) {
            setMsg(res.message ?? "Tersimpan");
            router.refresh();
          } else {
            setErr(res.error.message);
          }
        })
      }
      className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium">Edit info program</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Tutup
        </button>
      </div>

      <div>
        <label htmlFor="name" className="mb-1 block text-xs text-zinc-500">
          Nama
        </label>
        <input id="name" name="name" required maxLength={120} defaultValue={initial.name} className={inputCls} />
      </div>

      <div>
        <label htmlFor="type" className="mb-1 block text-xs text-zinc-500">
          Tipe
        </label>
        <select id="type" name="type" defaultValue={initial.type} className={inputCls}>
          <option value="main">Main</option>
          <option value="supporting">Pendukung</option>
        </select>
      </div>

      <div>
        <label htmlFor="goal" className="mb-1 block text-xs text-zinc-500">
          Goal
        </label>
        <input id="goal" name="goal" defaultValue={initial.goal} className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="startDate" className="mb-1 block text-xs text-zinc-500">
            Mulai
          </label>
          <input id="startDate" name="startDate" type="date" defaultValue={initial.startDate} className={inputCls} />
        </div>
        <div>
          <label htmlFor="endDate" className="mb-1 block text-xs text-zinc-500">
            Selesai
          </label>
          <input id="endDate" name="endDate" type="date" defaultValue={initial.endDate} className={inputCls} />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-xs text-zinc-500">
          Catatan
        </label>
        <textarea id="notes" name="notes" rows={3} defaultValue={initial.notes} className={inputCls} />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
        {msg ? <span className="text-xs text-green-600">{msg}</span> : null}
        {err ? <span className="text-xs text-red-600">{err}</span> : null}
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

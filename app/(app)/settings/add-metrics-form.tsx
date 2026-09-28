"use client";

import { useState, useTransition } from "react";
import { addMetricsAction } from "@/app/actions";
import { toIsoDate } from "@/lib/utils/dates";

function optNum(fd: FormData, key: string): number | undefined {
  const v = String(fd.get(key) ?? "").trim();
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function AddMetricsForm() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      action={(fd) =>
        start(async () => {
          setMsg(null);
          setErr(null);
          const effectiveFrom = String(fd.get("effectiveFrom") ?? "").trim();
          if (!effectiveFrom) {
            setErr("Tanggal berlaku wajib diisi");
            return;
          }
          const res = await addMetricsAction({
            effectiveFrom,
            maxHr: optNum(fd, "maxHr"),
            restingHr: optNum(fd, "restingHr"),
            lthr: optNum(fd, "lthr"),
            vo2max: optNum(fd, "vo2max"),
            targetCadenceSpm: optNum(fd, "targetCadenceSpm"),
            notes: String(fd.get("notes") ?? "").trim() || undefined,
          });
          if (res.ok) setMsg(res.message ?? "Tersimpan");
          else setErr(res.error.message);
        })
      }
      className="space-y-3"
    >
      <div>
        <label htmlFor="effectiveFrom" className="mb-1 block text-xs text-zinc-500">
          Berlaku sejak
        </label>
        <input
          id="effectiveFrom"
          name="effectiveFrom"
          type="date"
          defaultValue={toIsoDate(new Date())}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { name: "maxHr", label: "Max HR", placeholder: "195" },
          { name: "restingHr", label: "RHR", placeholder: "55" },
          { name: "lthr", label: "LTHR", placeholder: "172" },
          { name: "vo2max", label: "VO2max", placeholder: "42" },
          { name: "targetCadenceSpm", label: "Cadence", placeholder: "180" },
        ].map((f) => (
          <div key={f.name}>
            <label htmlFor={f.name} className="mb-1 block text-xs text-zinc-500">
              {f.label}
            </label>
            <input
              id={f.name}
              name={f.name}
              type="number"
              inputMode="numeric"
              placeholder={f.placeholder}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        ))}
      </div>
      <div>
        <label htmlFor="notes" className="mb-1 block text-xs text-zinc-500">
          Catatan (opsional)
        </label>
        <input
          id="notes"
          name="notes"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Menyimpan…" : "Simpan metrik"}
        </button>
        {msg ? <span className="text-xs text-green-600">{msg}</span> : null}
        {err ? <span className="text-xs text-red-600">{err}</span> : null}
      </div>
    </form>
  );
}

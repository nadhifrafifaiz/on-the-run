"use client";

import { useState, useTransition } from "react";
import { updateProfileAction } from "@/app/actions";

type Initial = {
  displayName: string;
  timezone: string;
  units: "metric" | "imperial";
  weekStart: "monday" | "sunday";
};

export function ProfileForm({ initial }: { initial: Initial }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      action={(fd) =>
        start(async () => {
          setMsg(null);
          setErr(null);
          const res = await updateProfileAction({
            displayName: String(fd.get("displayName") ?? "").trim() || undefined,
            timezone: String(fd.get("timezone") ?? "Asia/Jakarta"),
            units: fd.get("units") as "metric" | "imperial",
            weekStart: fd.get("weekStart") as "monday" | "sunday",
          });
          if (res.ok) setMsg(res.message ?? "Tersimpan");
          else setErr(res.error.message);
        })
      }
      className="space-y-3"
    >
      <div>
        <label htmlFor="displayName" className="mb-1 block text-xs text-zinc-500">
          Nama tampilan
        </label>
        <input
          id="displayName"
          name="displayName"
          defaultValue={initial.displayName}
          maxLength={80}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div>
        <label htmlFor="timezone" className="mb-1 block text-xs text-zinc-500">
          Timezone
        </label>
        <input
          id="timezone"
          name="timezone"
          defaultValue={initial.timezone}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="units" className="mb-1 block text-xs text-zinc-500">
            Satuan
          </label>
          <select
            id="units"
            name="units"
            defaultValue={initial.units}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="metric">Metric</option>
            <option value="imperial">Imperial</option>
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="weekStart" className="mb-1 block text-xs text-zinc-500">
            Minggu mulai
          </label>
          <select
            id="weekStart"
            name="weekStart"
            defaultValue={initial.weekStart}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="monday">Senin</option>
            <option value="sunday">Minggu</option>
          </select>
        </div>
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

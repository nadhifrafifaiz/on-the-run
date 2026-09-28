"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRaceAction, updateRaceAction } from "@/app/actions";
import type { RaceInput } from "@/lib/services/races";

const DISTANCE_LABELS = [
  { value: "", label: "—" },
  { value: "5K", label: "5K" },
  { value: "10K", label: "10K" },
  { value: "HM", label: "Half Marathon (21K)" },
  { value: "FM", label: "Full Marathon (42K)" },
  { value: "other", label: "Lainnya" },
] as const;

const STATUSES = [
  { value: "planned", label: "Rencana" },
  { value: "done", label: "Selesai" },
  { value: "dns", label: "DNS (tidak start)" },
  { value: "dnf", label: "DNF (tidak selesai)" },
] as const;

export type RaceInitial = {
  name: string;
  date: string;
  location: string;
  distanceKm: string;
  distanceLabel: string;
  status: "planned" | "done" | "dns" | "dnf";
  targetTimeMs: string; // "h:mm:ss" or ""
  chipTimeMs: string;
  watchTimeMs: string;
  rankOverall: string;
  totalOverall: string;
  rankGender: string;
  totalGender: string;
  rankCategory: string;
  totalCategory: string;
  strategy: string;
  report: string;
};

type Props = {
  mode: "create" | "edit";
  raceId?: string;
  initial: RaceInitial;
};

function parseIntOrNull(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function parseTimeToSec(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const parts = t.split(":").map((s) => Number(s.trim()));
  if (parts.some((n) => !Number.isFinite(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function RaceForm({ mode, raceId, initial }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <form
      action={(fd) =>
        start(async () => {
          setErr(null);
          setMsg(null);
          const distanceKm = parseFloat(String(fd.get("distanceKm") ?? "").trim() || "");
          const input: RaceInput = {
            name: String(fd.get("name") ?? "").trim(),
            date: String(fd.get("date") ?? ""),
            location: String(fd.get("location") ?? "").trim() || null,
            distanceM: Number.isFinite(distanceKm) ? Math.round(distanceKm * 1000) : null,
            distanceLabel:
              (String(fd.get("distanceLabel") ?? "").trim() as RaceInput["distanceLabel"]) || null,
            status: String(fd.get("status") ?? "planned") as RaceInput["status"],
            targetTimeSec: parseTimeToSec(String(fd.get("targetTime") ?? "")),
            chipTimeSec: parseTimeToSec(String(fd.get("chipTime") ?? "")),
            watchTimeSec: parseTimeToSec(String(fd.get("watchTime") ?? "")),
            rankOverall: parseIntOrNull(String(fd.get("rankOverall") ?? "")),
            totalOverall: parseIntOrNull(String(fd.get("totalOverall") ?? "")),
            rankGender: parseIntOrNull(String(fd.get("rankGender") ?? "")),
            totalGender: parseIntOrNull(String(fd.get("totalGender") ?? "")),
            rankCategory: parseIntOrNull(String(fd.get("rankCategory") ?? "")),
            totalCategory: parseIntOrNull(String(fd.get("totalCategory") ?? "")),
            strategy: String(fd.get("strategy") ?? "").trim() || null,
            report: String(fd.get("report") ?? "").trim() || null,
          };

          if (!input.name || !input.date) {
            setErr("Nama dan tanggal wajib diisi");
            return;
          }

          if (mode === "create") {
            const res = await createRaceAction(input);
            if (res.ok) router.push(`/races/${res.data.id}`);
            else setErr(res.error.message);
          } else {
            const res = await updateRaceAction(raceId!, input);
            if (res.ok) {
              setMsg(res.message ?? "Tersimpan");
              router.push(`/races/${raceId}`);
            } else setErr(res.error.message);
          }
        })
      }
      className="space-y-4"
    >
      <fieldset className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Dasar
        </legend>
        <div>
          <label htmlFor="name" className="mb-1 block text-xs text-zinc-500">
            Nama race *
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={initial.name}
            placeholder="Pocari Sweat Run Bandung 2027"
            className={inputCls}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="date" className="mb-1 block text-xs text-zinc-500">
              Tanggal *
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={initial.date}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="location" className="mb-1 block text-xs text-zinc-500">
              Lokasi
            </label>
            <input
              id="location"
              name="location"
              defaultValue={initial.location}
              placeholder="Bandung"
              className={inputCls}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="distanceLabel" className="mb-1 block text-xs text-zinc-500">
              Kategori
            </label>
            <select
              id="distanceLabel"
              name="distanceLabel"
              defaultValue={initial.distanceLabel}
              className={inputCls}
            >
              {DISTANCE_LABELS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="distanceKm" className="mb-1 block text-xs text-zinc-500">
              Jarak (km)
            </label>
            <input
              id="distanceKm"
              name="distanceKm"
              type="number"
              step="0.01"
              inputMode="decimal"
              defaultValue={initial.distanceKm}
              placeholder="21.1"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="status" className="mb-1 block text-xs text-zinc-500">
              Status
            </label>
            <select id="status" name="status" defaultValue={initial.status} className={inputCls}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Target &amp; hasil (opsional)
        </legend>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="targetTime" className="mb-1 block text-xs text-zinc-500">
              Target time
            </label>
            <input
              id="targetTime"
              name="targetTime"
              defaultValue={initial.targetTimeMs}
              placeholder="2:45:00"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="chipTime" className="mb-1 block text-xs text-zinc-500">
              Chip time
            </label>
            <input
              id="chipTime"
              name="chipTime"
              defaultValue={initial.chipTimeMs}
              placeholder="2:57:04"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="watchTime" className="mb-1 block text-xs text-zinc-500">
              Watch time
            </label>
            <input
              id="watchTime"
              name="watchTime"
              defaultValue={initial.watchTimeMs}
              placeholder="2:58:27"
              className={inputCls}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <RankFields
            label="Overall"
            rank={initial.rankOverall}
            total={initial.totalOverall}
            rankName="rankOverall"
            totalName="totalOverall"
          />
          <RankFields
            label="Gender"
            rank={initial.rankGender}
            total={initial.totalGender}
            rankName="rankGender"
            totalName="totalGender"
          />
          <RankFields
            label="Kategori"
            rank={initial.rankCategory}
            total={initial.totalCategory}
            rankName="rankCategory"
            totalName="totalCategory"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Strategi &amp; catatan
        </legend>
        <div>
          <label htmlFor="strategy" className="mb-1 block text-xs text-zinc-500">
            Strategi
          </label>
          <textarea
            id="strategy"
            name="strategy"
            rows={3}
            defaultValue={initial.strategy}
            placeholder="Target sub-2:45, negative split. Fuel gel di 10K, 15K."
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="report" className="mb-1 block text-xs text-zinc-500">
            Race report (markdown)
          </label>
          <textarea
            id="report"
            name="report"
            rows={8}
            defaultValue={initial.report}
            className={`${inputCls} font-mono text-xs`}
          />
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Menyimpan…" : mode === "create" ? "Buat race" : "Simpan perubahan"}
        </button>
        {msg ? <span className="text-xs text-green-600">{msg}</span> : null}
        {err ? <span className="text-xs text-red-600">{err}</span> : null}
      </div>
    </form>
  );
}

function RankFields({
  label,
  rank,
  total,
  rankName,
  totalName,
}: {
  label: string;
  rank: string;
  total: string;
  rankName: string;
  totalName: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-500">{label}</label>
      <div className="flex items-center gap-1">
        <input
          name={rankName}
          type="number"
          inputMode="numeric"
          defaultValue={rank}
          placeholder="rank"
          className={inputCls}
        />
        <span className="text-xs text-zinc-400">/</span>
        <input
          name={totalName}
          type="number"
          inputMode="numeric"
          defaultValue={total}
          placeholder="total"
          className={inputCls}
        />
      </div>
    </div>
  );
}

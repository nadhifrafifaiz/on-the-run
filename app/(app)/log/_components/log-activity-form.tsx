"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logActivityAction, updateActivityAction } from "@/app/actions";
import type { ActivityLogInput } from "@/lib/schemas/forms";

type SessionOption = { id: string; date: string; label: string; sport: string };

// Prefill populates the form on mount — from a draft, planned session, or JSON import.
export type LogFormPrefill = {
  date?: string;
  startedAtTime?: string | null; // "HH:mm"
  sport?: string;
  sessionType?: string | null;
  title?: string | null;
  durationSec?: number | null;
  distanceM?: number | null;
  avgHr?: number | null;
  maxHr?: number | null;
  calories?: number | null;
  trainingLoad?: number | null;
  rpe?: number | null;
  feel?: string | null;
  notes?: string | null;
  plannedSessionId?: string | null;
  source?: "manual" | "json" | "mcp" | "notion";
  run?: {
    avgPaceSecPerKm?: number | null;
    cadenceSpm?: number | null;
    elevationGainM?: number | null;
  } | null;
  items?: Array<{
    name: string;
    sets: Array<{
      reps?: number | null;
      loadKg?: number | null;
      durationSec?: number | null;
      status?: string;
    }>;
  }>;
};

type Props = {
  defaultDate: string;
  sessionOptions: SessionOption[];
  prefill?: LogFormPrefill;
  draftId?: string;
  editActivityId?: string; // when set, submits as update instead of insert
};

function fmtDurationForInput(sec: number | null | undefined): string {
  if (sec == null) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function fmtPaceForInput(sec: number | null | undefined): string {
  if (sec == null) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const SPORTS = [
  { value: "run", label: "Lari" },
  { value: "strength", label: "Strength" },
  { value: "hiit", label: "HIIT" },
  { value: "cycling", label: "Sepeda" },
  { value: "swim", label: "Renang" },
  { value: "mobility", label: "Mobility" },
  { value: "walk", label: "Jalan" },
  { value: "other", label: "Lainnya" },
] as const;

const SESSION_TYPES = [
  { value: "", label: "—" },
  { value: "easy", label: "Easy" },
  { value: "long", label: "Long" },
  { value: "tempo", label: "Tempo" },
  { value: "interval", label: "Interval" },
  { value: "recovery", label: "Recovery" },
  { value: "race", label: "Race" },
  { value: "strength", label: "Strength" },
  { value: "hiit", label: "HIIT" },
  { value: "mobility", label: "Mobility" },
  { value: "cross", label: "Cross" },
  { value: "other", label: "Lainnya" },
] as const;

const FEELS = [
  { value: "", label: "—" },
  { value: "great", label: "Great" },
  { value: "good", label: "Good" },
  { value: "okay", label: "Okay" },
  { value: "tough", label: "Tough" },
  { value: "bad", label: "Bad" },
] as const;

// "1:23:45" | "23:45" → seconds. Empty → null.
function parseDuration(input: string): number | null {
  const t = input.trim();
  if (!t) return null;
  const parts = t.split(":").map((s) => Number(s.trim()));
  if (parts.some((n) => !Number.isFinite(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

// "5:23" pace (min:sec/km) → sec/km. Empty → null.
function parsePace(input: string): number | null {
  const t = input.trim();
  if (!t) return null;
  const m = t.match(/^(\d+)[:'](\d{1,2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function num(fd: FormData, key: string): number | null {
  const v = String(fd.get(key) ?? "").trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v || null;
}

type Set = { setNumber: number; reps: string; loadKg: string; durationSec: string; status: string };

export function LogActivityForm({
  defaultDate,
  sessionOptions,
  prefill,
  draftId,
  editActivityId,
}: Props) {
  const [sport, setSport] = useState<string>(prefill?.sport ?? "run");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const isEdit = Boolean(editActivityId);

  // Strength: items with sets
  const [items, setItems] = useState<Array<{ name: string; sets: Set[] }>>(
    prefill?.items && prefill.items.length > 0
      ? prefill.items.map((it) => ({
          name: it.name,
          sets:
            it.sets.length > 0
              ? it.sets.map((s, i) => ({
                  setNumber: i + 1,
                  reps: s.reps != null ? String(s.reps) : "",
                  loadKg: s.loadKg != null ? String(s.loadKg) : "",
                  durationSec: s.durationSec != null ? String(s.durationSec) : "",
                  status: s.status ?? "done",
                }))
              : [{ setNumber: 1, reps: "", loadKg: "", durationSec: "", status: "done" }],
        }))
      : [
          {
            name: "",
            sets: [{ setNumber: 1, reps: "", loadKg: "", durationSec: "", status: "done" }],
          },
        ],
  );

  const showRun = sport === "run";
  // Items/blocks are useful for ALL sports (warmup/main/cooldown for run, circuit for strength).
  // Was gated on strength/hiit before, but planned run sessions with blocks weren't editable.
  const showItems = true;

  const sessionsSameSport = useMemo(
    () => sessionOptions.filter((s) => s.sport === sport),
    [sport, sessionOptions],
  );

  return (
    <form
      action={(fd) =>
        start(async () => {
          setErr(null);
          const dateStr = String(fd.get("date") ?? defaultDate);
          const paceRaw = String(fd.get("run_pace") ?? "");
          const durationRaw = String(fd.get("duration") ?? "");
          const startedAtTime = String(fd.get("startedAtTime") ?? "").trim();
          const startedAtIso =
            startedAtTime && /^\d{2}:\d{2}$/.test(startedAtTime)
              ? new Date(`${dateStr}T${startedAtTime}:00`).toISOString()
              : null;

          const input: ActivityLogInput = {
            date: dateStr,
            startedAt: startedAtIso,
            sport: sport as ActivityLogInput["sport"],
            sessionType: (str(fd, "sessionType") as ActivityLogInput["sessionType"]) ?? null,
            title: str(fd, "title"),
            durationSec: parseDuration(durationRaw),
            distanceM: (() => {
              const km = num(fd, "distance_km");
              return km == null ? null : Math.round(km * 1000);
            })(),
            avgHr: num(fd, "avgHr"),
            maxHr: num(fd, "maxHr"),
            calories: num(fd, "calories"),
            trainingLoad: num(fd, "trainingLoad"),
            rpe: num(fd, "rpe"),
            feel: (str(fd, "feel") as ActivityLogInput["feel"]) ?? null,
            notes: str(fd, "notes"),
            source: prefill?.source ?? "manual",
            plannedSessionId: str(fd, "plannedSessionId"),
            draftId: draftId ?? null,
            effortDistanceM: null,
            items: showItems
              ? items
                  .filter((i) => i.name.trim())
                  .map((i, idx) => ({
                    name: i.name.trim(),
                    position: idx,
                    sets: i.sets
                      .filter((s) => s.reps || s.durationSec || s.loadKg)
                      .map((s) => ({
                        setNumber: s.setNumber,
                        reps: s.reps ? Number(s.reps) : null,
                        loadKg: s.loadKg ? Number(s.loadKg) : null,
                        durationSec: s.durationSec ? Number(s.durationSec) : null,
                        status: s.status as "done" | "partial" | "failed" | "skipped",
                      })),
                  }))
              : [],
            run: showRun
              ? {
                  avgPaceSecPerKm: parsePace(paceRaw),
                  cadenceSpm: num(fd, "run_cadence"),
                  elevationGainM: num(fd, "run_elev"),
                }
              : null,
          };

          if (editActivityId) {
            const res = await updateActivityAction(editActivityId, input);
            if (res.ok) {
              setMsg(res.message ?? "Tersimpan");
              router.push(`/activities/${editActivityId}`);
            } else setErr(res.error.message);
          } else {
            const res = await logActivityAction(input);
            if (res.ok) router.push("/today");
            else setErr(res.error.message);
          }
        })
      }
      className="space-y-6"
    >
      {/* Basics */}
      <fieldset className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Dasar
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="date" className="mb-1 block text-xs text-zinc-500">
              Tanggal
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={prefill?.date ?? defaultDate}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="startedAtTime" className="mb-1 block text-xs text-zinc-500">
              Jam mulai (opsional)
            </label>
            <input
              id="startedAtTime"
              name="startedAtTime"
              type="time"
              defaultValue={prefill?.startedAtTime ?? ""}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="sport" className="mb-1 block text-xs text-zinc-500">
              Sport
            </label>
            <select
              id="sport"
              name="sport"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {SPORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sessionType" className="mb-1 block text-xs text-zinc-500">
              Tipe
            </label>
            <select
              id="sessionType"
              name="sessionType"
              defaultValue={prefill?.sessionType ?? ""}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {SESSION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="title" className="mb-1 block text-xs text-zinc-500">
            Judul (opsional)
          </label>
          <input
            id="title"
            name="title"
            defaultValue={prefill?.title ?? ""}
            placeholder="Easy morning 5K"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        {sessionsSameSport.length > 0 ? (
          <div>
            <label htmlFor="plannedSessionId" className="mb-1 block text-xs text-zinc-500">
              Tautkan ke sesi rencana (opsional)
            </label>
            <select
              id="plannedSessionId"
              name="plannedSessionId"
              defaultValue={
                prefill?.plannedSessionId ??
                sessionsSameSport.find((s) => s.date === (prefill?.date ?? defaultDate))?.id ??
                ""
              }
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">— tanpa sesi rencana —</option>
              {sessionsSameSport.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </fieldset>

      {/* Metrics */}
      <fieldset className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Metrik
        </legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label htmlFor="duration" className="mb-1 block text-xs text-zinc-500">
              Durasi
            </label>
            <input
              id="duration"
              name="duration"
              inputMode="numeric"
              defaultValue={fmtDurationForInput(prefill?.durationSec)}
              placeholder="45:00 atau 1:23:45"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="distance_km" className="mb-1 block text-xs text-zinc-500">
              Jarak (km)
            </label>
            <input
              id="distance_km"
              name="distance_km"
              inputMode="decimal"
              defaultValue={prefill?.distanceM ? (prefill.distanceM / 1000).toString() : ""}
              placeholder="5.2"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="avgHr" className="mb-1 block text-xs text-zinc-500">
              Avg HR
            </label>
            <input
              id="avgHr"
              name="avgHr"
              type="number"
              inputMode="numeric"
              defaultValue={prefill?.avgHr ?? ""}
              placeholder="145"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="maxHr" className="mb-1 block text-xs text-zinc-500">
              Max HR
            </label>
            <input
              id="maxHr"
              name="maxHr"
              type="number"
              inputMode="numeric"
              defaultValue={prefill?.maxHr ?? ""}
              placeholder="170"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label htmlFor="calories" className="mb-1 block text-xs text-zinc-500">
              Kalori
            </label>
            <input
              id="calories"
              name="calories"
              type="number"
              inputMode="numeric"
              defaultValue={prefill?.calories ?? ""}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="trainingLoad" className="mb-1 block text-xs text-zinc-500">
              Training Load
            </label>
            <input
              id="trainingLoad"
              name="trainingLoad"
              type="number"
              inputMode="numeric"
              defaultValue={prefill?.trainingLoad ?? ""}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="rpe" className="mb-1 block text-xs text-zinc-500">
              RPE (1–10)
            </label>
            <input
              id="rpe"
              name="rpe"
              type="number"
              inputMode="numeric"
              min={1}
              max={10}
              defaultValue={prefill?.rpe ?? ""}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="feel" className="mb-1 block text-xs text-zinc-500">
              Feel
            </label>
            <select
              id="feel"
              name="feel"
              defaultValue={prefill?.feel ?? ""}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {FEELS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {/* Run-specific */}
      {showRun ? (
        <fieldset className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Detail lari
          </legend>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="run_pace" className="mb-1 block text-xs text-zinc-500">
                Pace (m:ss /km)
              </label>
              <input
                id="run_pace"
                name="run_pace"
                inputMode="numeric"
                defaultValue={fmtPaceForInput(prefill?.run?.avgPaceSecPerKm)}
                placeholder="6:00"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label htmlFor="run_cadence" className="mb-1 block text-xs text-zinc-500">
                Cadence (spm)
              </label>
              <input
                id="run_cadence"
                name="run_cadence"
                type="number"
                inputMode="numeric"
                defaultValue={prefill?.run?.cadenceSpm ?? ""}
                placeholder="180"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label htmlFor="run_elev" className="mb-1 block text-xs text-zinc-500">
                Elevasi (m)
              </label>
              <input
                id="run_elev"
                name="run_elev"
                type="number"
                inputMode="numeric"
                defaultValue={prefill?.run?.elevationGainM ?? ""}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          </div>
        </fieldset>
      ) : null}

      {/* Items (all sports — warmup/main/cooldown for run, circuit for strength) */}
      {showItems ? (
        <fieldset className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Gerakan & set
          </legend>
          <ul className="space-y-3">
            {items.map((item, iIdx) => (
              <li key={iIdx} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    value={item.name}
                    onChange={(e) => {
                      const next = [...items];
                      next[iIdx] = { ...next[iIdx], name: e.target.value };
                      setItems(next);
                    }}
                    placeholder="Nama gerakan (mis. Pull-up)"
                    className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <button
                    type="button"
                    onClick={() => setItems(items.filter((_, i) => i !== iIdx))}
                    className="text-xs text-zinc-500 hover:text-red-600"
                  >
                    Hapus
                  </button>
                </div>
                <ul className="space-y-1.5">
                  {item.sets.map((s, sIdx) => (
                    <li key={sIdx} className="grid grid-cols-5 gap-2">
                      <span className="text-xs text-zinc-500 self-center">Set {s.setNumber}</span>
                      <input
                        value={s.reps}
                        onChange={(e) => {
                          const next = [...items];
                          next[iIdx].sets[sIdx].reps = e.target.value;
                          setItems(next);
                        }}
                        placeholder="reps"
                        inputMode="numeric"
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <input
                        value={s.loadKg}
                        onChange={(e) => {
                          const next = [...items];
                          next[iIdx].sets[sIdx].loadKg = e.target.value;
                          setItems(next);
                        }}
                        placeholder="kg"
                        inputMode="decimal"
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <input
                        value={s.durationSec}
                        onChange={(e) => {
                          const next = [...items];
                          next[iIdx].sets[sIdx].durationSec = e.target.value;
                          setItems(next);
                        }}
                        placeholder="detik"
                        inputMode="numeric"
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <select
                        value={s.status}
                        onChange={(e) => {
                          const next = [...items];
                          next[iIdx].sets[sIdx].status = e.target.value;
                          setItems(next);
                        }}
                        className="rounded-md border border-zinc-300 bg-white px-1 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <option value="done">done</option>
                        <option value="partial">partial</option>
                        <option value="failed">failed</option>
                        <option value="skipped">skipped</option>
                      </select>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    const next = [...items];
                    next[iIdx].sets.push({
                      setNumber: next[iIdx].sets.length + 1,
                      reps: "",
                      loadKg: "",
                      durationSec: "",
                      status: "done",
                    });
                    setItems(next);
                  }}
                  className="mt-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  + tambah set
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() =>
              setItems([
                ...items,
                {
                  name: "",
                  sets: [{ setNumber: 1, reps: "", loadKg: "", durationSec: "", status: "done" }],
                },
              ])
            }
            className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            + tambah gerakan
          </button>
        </fieldset>
      ) : null}

      {/* Notes */}
      <fieldset className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Catatan
        </legend>
        <textarea
          name="notes"
          rows={3}
          defaultValue={prefill?.notes ?? ""}
          placeholder="Apa yang berjalan bagus / harus dicatat?"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Menyimpan…" : isEdit ? "Simpan perubahan" : "Simpan aktivitas"}
        </button>
        {msg ? <span className="text-xs text-green-600">{msg}</span> : null}
        {err ? <span className="text-xs text-red-600">{err}</span> : null}
      </div>
    </form>
  );
}

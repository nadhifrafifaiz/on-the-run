"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSessionAction, updateSessionAction } from "@/app/actions";
import type { PlannedSessionInput } from "@/lib/schemas/forms";

type ProgramOption = { id: string; name: string; status: string };

const SPORTS = [
  { value: "run", label: "Lari" },
  { value: "strength", label: "Strength" },
  { value: "hiit", label: "HIIT" },
  { value: "cycling", label: "Sepeda" },
  { value: "swim", label: "Renang" },
  { value: "mobility", label: "Mobility" },
  { value: "walk", label: "Jalan" },
  { value: "rest", label: "Rest" },
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
  { value: "rest", label: "Rest" },
  { value: "other", label: "Lainnya" },
] as const;

const STATUSES = [
  { value: "planned", label: "Planned" },
  { value: "done", label: "Done" },
  { value: "skipped", label: "Skipped" },
  { value: "modified", label: "Modified" },
] as const;

export type InitialItem = {
  name: string;
  sets: string;
  reps: string;
  durationSec: string;
  distanceM: string;
  loadKg: string;
  restSec: string;
  target: string;
  notes: string;
};
export type InitialBlock = {
  name: string;
  rounds: string;
  notes: string;
  items: InitialItem[];
};

type Initial = {
  date: string;
  programId: string | null;
  sport: string;
  sessionType: string | null;
  title: string | null;
  description: string | null;
  targetDurationMinMin: number | null; // minutes
  targetDurationMaxMin: number | null;
  targetDistanceKm: number | null;
  targetIntensity: string | null;
  status: "planned" | "done" | "skipped" | "modified";
  statusNote: string | null;
  blocks: InitialBlock[];
};

const EMPTY_ITEM: InitialItem = {
  name: "",
  sets: "",
  reps: "",
  durationSec: "",
  distanceM: "",
  loadKg: "",
  restSec: "",
  target: "",
  notes: "",
};

function numOr(fd: FormData, key: string, transform: (n: number) => number = (n) => n): number | null {
  const v = String(fd.get(key) ?? "").trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? transform(n) : null;
}

function strOr(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v || null;
}

type Props = {
  mode: "create" | "edit";
  sessionId?: string;
  initial: Initial;
  programs: ProgramOption[];
};

function parseIntOrNull(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n) : null;
}
function parseFloatOrNull(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
function collectBlocks(blocks: InitialBlock[]): NonNullable<PlannedSessionInput["blocks"]> {
  return blocks
    .filter((b) => b.items.some((i) => i.name.trim()) || b.name.trim())
    .map((b, bi) => ({
      name: b.name.trim() || undefined,
      rounds: Math.max(1, parseIntOrNull(b.rounds) ?? 1),
      notes: b.notes.trim() || undefined,
      position: bi,
      items: b.items
        .filter((i) => i.name.trim())
        .map((i, ii) => ({
          name: i.name.trim(),
          position: ii,
          sets: parseIntOrNull(i.sets),
          reps: parseIntOrNull(i.reps),
          durationSec: parseIntOrNull(i.durationSec),
          distanceM: parseIntOrNull(i.distanceM),
          loadKg: parseFloatOrNull(i.loadKg),
          restSec: parseIntOrNull(i.restSec),
          target: i.target.trim() || null,
          notes: i.notes.trim() || null,
        })),
    }));
}

export function SessionForm({ mode, sessionId, initial, programs }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<InitialBlock[]>(
    initial.blocks.length > 0
      ? initial.blocks
      : [{ name: "Main", rounds: "1", notes: "", items: [{ ...EMPTY_ITEM }] }],
  );

  const patchBlock = (bi: number, patch: Partial<InitialBlock>) => {
    setBlocks((prev) => prev.map((b, i) => (i === bi ? { ...b, ...patch } : b)));
  };
  const patchItem = (bi: number, ii: number, patch: Partial<InitialItem>) => {
    setBlocks((prev) =>
      prev.map((b, i) =>
        i === bi
          ? { ...b, items: b.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) }
          : b,
      ),
    );
  };
  const addBlock = () =>
    setBlocks((prev) => [
      ...prev,
      { name: "", rounds: "1", notes: "", items: [{ ...EMPTY_ITEM }] },
    ]);
  const removeBlock = (bi: number) => setBlocks((prev) => prev.filter((_, i) => i !== bi));
  const addItem = (bi: number) =>
    setBlocks((prev) =>
      prev.map((b, i) => (i === bi ? { ...b, items: [...b.items, { ...EMPTY_ITEM }] } : b)),
    );
  const removeItem = (bi: number, ii: number) =>
    setBlocks((prev) =>
      prev.map((b, i) =>
        i === bi ? { ...b, items: b.items.filter((_, j) => j !== ii) } : b,
      ),
    );

  return (
    <form
      action={(fd) =>
        start(async () => {
          setErr(null);
          setMsg(null);

          const collectedBlocks = collectBlocks(blocks);
          const input: Partial<PlannedSessionInput> = {
            date: String(fd.get("date")),
            programId: (strOr(fd, "programId") as string | null) ?? null,
            sport: String(fd.get("sport")) as PlannedSessionInput["sport"],
            sessionType:
              (strOr(fd, "sessionType") as PlannedSessionInput["sessionType"]) ?? null,
            title: strOr(fd, "title"),
            description: strOr(fd, "description"),
            targetDurationMinSec: numOr(fd, "targetDurationMinMin", (n) => n * 60),
            targetDurationMaxSec: numOr(fd, "targetDurationMaxMin", (n) => n * 60),
            targetDistanceM: numOr(fd, "targetDistanceKm", (n) => Math.round(n * 1000)),
            targetIntensity: strOr(fd, "targetIntensity"),
            status: String(fd.get("status")) as PlannedSessionInput["status"],
            position: 0,
            blocks: collectedBlocks,
          };

          if (mode === "create") {
            const res = await createSessionAction(input as PlannedSessionInput);
            if (res.ok) router.push(`/sessions/${res.data.id}`);
            else setErr(res.error.message);
          } else {
            const res = await updateSessionAction(sessionId!, input);
            if (res.ok) {
              setMsg(res.message ?? "Tersimpan");
              router.refresh();
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
        <div className="grid grid-cols-2 gap-3">
          <Field id="date" label="Tanggal">
            <input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={initial.date}
              className={inputCls}
            />
          </Field>
          <Field id="programId" label="Program">
            <select
              id="programId"
              name="programId"
              defaultValue={initial.programId ?? ""}
              className={inputCls}
            >
              <option value="">— tanpa program (sesi lepas) —</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status})
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field id="sport" label="Sport">
            <select id="sport" name="sport" defaultValue={initial.sport} className={inputCls}>
              {SPORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="sessionType" label="Tipe sesi">
            <select
              id="sessionType"
              name="sessionType"
              defaultValue={initial.sessionType ?? ""}
              className={inputCls}
            >
              {SESSION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field id="title" label="Judul">
          <input
            id="title"
            name="title"
            defaultValue={initial.title ?? ""}
            placeholder="Easy Run 30 menit"
            className={inputCls}
          />
        </Field>
        <Field id="description" label="Deskripsi (opsional)">
          <textarea
            id="description"
            name="description"
            defaultValue={initial.description ?? ""}
            rows={2}
            className={inputCls}
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Target (opsional)
        </legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field id="targetDurationMinMin" label="Durasi min (menit)">
            <input
              id="targetDurationMinMin"
              name="targetDurationMinMin"
              type="number"
              inputMode="numeric"
              defaultValue={initial.targetDurationMinMin ?? ""}
              className={inputCls}
            />
          </Field>
          <Field id="targetDurationMaxMin" label="Durasi max (menit)">
            <input
              id="targetDurationMaxMin"
              name="targetDurationMaxMin"
              type="number"
              inputMode="numeric"
              defaultValue={initial.targetDurationMaxMin ?? ""}
              className={inputCls}
            />
          </Field>
          <Field id="targetDistanceKm" label="Jarak (km)">
            <input
              id="targetDistanceKm"
              name="targetDistanceKm"
              type="number"
              step="0.01"
              inputMode="decimal"
              defaultValue={initial.targetDistanceKm ?? ""}
              className={inputCls}
            />
          </Field>
          <Field id="targetIntensity" label="Intensitas">
            <input
              id="targetIntensity"
              name="targetIntensity"
              defaultValue={initial.targetIntensity ?? ""}
              placeholder="Z1-Z2"
              className={inputCls}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Gerakan &amp; Set (opsional)
        </legend>
        <p className="text-xs text-zinc-500">
          Susun apa yang akan dilakukan. Contoh untuk lari: Warmup → Main → Cooldown. Untuk strength:
          1 block dengan beberapa gerakan (nama + sets + reps + load).
        </p>
        {blocks.map((block, bi) => (
          <div
            key={bi}
            className="space-y-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[140px] flex-1">
                <label className="mb-1 block text-xs text-zinc-500">Nama block</label>
                <input
                  value={block.name}
                  onChange={(e) => patchBlock(bi, { name: e.target.value })}
                  placeholder="Main / Warmup / Circuit"
                  className={inputCls}
                />
              </div>
              <div className="w-24">
                <label className="mb-1 block text-xs text-zinc-500">Ronde</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={block.rounds}
                  onChange={(e) => patchBlock(bi, { rounds: e.target.value })}
                  className={inputCls}
                />
              </div>
              {blocks.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeBlock(bi)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Hapus block
                </button>
              ) : null}
            </div>

            <ul className="space-y-3">
              {block.items.map((item, ii) => (
                <li
                  key={ii}
                  className="space-y-2 rounded-md border border-zinc-100 p-3 dark:border-zinc-800/50"
                >
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="mb-1 block text-[10px] text-zinc-500">Nama gerakan</label>
                      <input
                        value={item.name}
                        onChange={(e) => patchItem(bi, ii, { name: e.target.value })}
                        placeholder="Easy jog / Pull-up / Squat"
                        className={inputCls}
                      />
                    </div>
                    {block.items.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeItem(bi, ii)}
                        className="text-xs text-zinc-500 hover:text-red-600"
                      >
                        Hapus
                      </button>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    <MiniField
                      label="Sets"
                      value={item.sets}
                      onChange={(v) => patchItem(bi, ii, { sets: v })}
                      placeholder="3"
                    />
                    <MiniField
                      label="Reps"
                      value={item.reps}
                      onChange={(v) => patchItem(bi, ii, { reps: v })}
                      placeholder="10"
                    />
                    <MiniField
                      label="Durasi (dtk)"
                      value={item.durationSec}
                      onChange={(v) => patchItem(bi, ii, { durationSec: v })}
                      placeholder="1800"
                    />
                    <MiniField
                      label="Jarak (m)"
                      value={item.distanceM}
                      onChange={(v) => patchItem(bi, ii, { distanceM: v })}
                      placeholder="80"
                    />
                    <MiniField
                      label="Load (kg)"
                      value={item.loadKg}
                      onChange={(v) => patchItem(bi, ii, { loadKg: v })}
                      placeholder="16"
                      step="0.5"
                    />
                    <MiniField
                      label="Rest (dtk)"
                      value={item.restSec}
                      onChange={(v) => patchItem(bi, ii, { restSec: v })}
                      placeholder="60"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] text-zinc-500">Target</label>
                      <input
                        value={item.target}
                        onChange={(e) => patchItem(bi, ii, { target: e.target.value })}
                        placeholder="HR 139-154 / RPE 7"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-zinc-500">Catatan</label>
                      <input
                        value={item.notes}
                        onChange={(e) => patchItem(bi, ii, { notes: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => addItem(bi)}
              className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              + Gerakan
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addBlock}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          + Block baru
        </button>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Status
        </legend>
        <Field id="status" label="Status sesi">
          <select id="status" name="status" defaultValue={initial.status} className={inputCls}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Menyimpan…" : mode === "create" ? "Buat sesi" : "Simpan perubahan"}
        </button>
        {msg ? <span className="text-xs text-green-600">{msg}</span> : null}
        {err ? <span className="text-xs text-red-600">{err}</span> : null}
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

function MiniField({
  label,
  value,
  onChange,
  placeholder,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] text-zinc-500">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-zinc-500">
        {label}
      </label>
      {children}
    </div>
  );
}

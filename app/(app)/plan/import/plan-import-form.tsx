"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyPlanImportAction } from "@/app/actions";
import { planImportZ } from "@/lib/schemas/plan-import";
import { normalizePlanImport } from "@/lib/schemas/normalize";

type ProgramOption = { id: string; name: string; type: string; status: string };

// Extract first JSON block from a string (may have surrounding text).
function extractJson(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

export function PlanImportForm({
  example,
  programs,
  defaultTargetProgramId = "",
  lockTargetProgram = false,
}: {
  example: string;
  programs: ProgramOption[];
  defaultTargetProgramId?: string;
  lockTargetProgram?: boolean;
}) {
  const [raw, setRaw] = useState("");
  const [targetProgramId, setTargetProgramId] = useState<string>(defaultTargetProgramId);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const preview = useMemo(() => {
    if (!raw.trim()) return null;
    const jsonStr = extractJson(raw);
    if (!jsonStr) return { error: "Tidak ada blok JSON ditemukan." };
    try {
      const parsed = normalizePlanImport(JSON.parse(jsonStr));
      const result = planImportZ.safeParse(parsed);
      if (!result.success) {
        return {
          error: `Schema tidak valid: ${result.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .slice(0, 3)
            .join("; ")}`,
        };
      }
      const d = result.data;
      return {
        ok: true as const,
        program: d.program ?? null,
        phaseCount: d.phases.length,
        phases: d.phases,
        sessionCount: d.sessions.length,
        sessions: d.sessions,
        weekNoteCount: d.week_notes.length,
        dateRange:
          d.sessions.length > 0
            ? {
                first: d.sessions.reduce((min, s) => (s.date < min ? s.date : min), d.sessions[0].date),
                last: d.sessions.reduce((max, s) => (s.date > max ? s.date : max), d.sessions[0].date),
              }
            : null,
        sports: [...new Set(d.sessions.map((s) => s.sport))],
        parsed: d,
      };
    } catch (e) {
      return { error: `JSON tidak valid: ${e instanceof Error ? e.message : "unknown"}` };
    }
  }, [raw]);

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="raw" className="text-xs text-zinc-500">
            JSON plan
          </label>
          <button
            type="button"
            onClick={() => setRaw(example)}
            className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Isi contoh
          </button>
        </div>
        <textarea
          id="raw"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={14}
          spellCheck={false}
          placeholder='{"schema":"plan","version":1,...}'
          className="w-full rounded-md border border-zinc-300 bg-white p-3 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>

      <div>
        <label htmlFor="targetProgram" className="mb-1 block text-xs text-zinc-500">
          Program tujuan {lockTargetProgram ? "(dikunci — datang dari halaman program)" : "(opsional — kalau JSON punya program, biarkan kosong)"}
        </label>
        <select
          id="targetProgram"
          value={targetProgramId}
          onChange={(e) => setTargetProgramId(e.target.value)}
          disabled={lockTargetProgram}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm disabled:opacity-70 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">— buat baru / sesi lepas —</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.type} · {p.status})
            </option>
          ))}
        </select>
      </div>

      {/* Preview */}
      {preview ? (
        <div
          className={`rounded-lg border p-3 text-sm ${
            "error" in preview
              ? "border-red-300 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
              : "border-green-300 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30"
          }`}
        >
          {"error" in preview ? (
            <p className="text-red-800 dark:text-red-200">{preview.error}</p>
          ) : (
            <div className="space-y-1 text-green-900 dark:text-green-200">
              <p>
                {preview.program ? (
                  <>Program baru: <strong>{preview.program.name}</strong> ({preview.program.type}) · </>
                ) : null}
                <strong>{preview.sessionCount}</strong> sesi
                {preview.phaseCount > 0 ? `, ${preview.phaseCount} fase` : ""}
                {preview.weekNoteCount > 0 ? `, ${preview.weekNoteCount} catatan minggu` : ""}
              </p>
              {preview.dateRange ? (
                <p className="text-xs">
                  Rentang sesi: {preview.dateRange.first} → {preview.dateRange.last}
                </p>
              ) : null}
              {preview.sports.length > 0 ? (
                <p className="text-xs">Sport: {preview.sports.join(", ")}</p>
              ) : null}
              {preview.phaseCount > 0 ? (
                <div className="mt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider">Fase:</p>
                  <ul className="mt-0.5 space-y-0.5 text-xs">
                    {preview.phases.map((p, i) => (
                      <li key={i}>
                        · <strong>{p.name}</strong>: {p.start_date} → {p.end_date}
                        {p.focus ? ` · ${p.focus}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {preview.sessionCount > 0 ? (
                <div className="mt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider">
                    Sesi ({preview.sessionCount}):
                  </p>
                  <ul className="mt-0.5 max-h-64 space-y-0.5 overflow-y-auto text-xs">
                    {preview.sessions.map((s, i) => {
                      const dur =
                        s.target_duration_min && s.target_duration_max
                          ? `${s.target_duration_min}-${s.target_duration_max}m`
                          : s.target_duration_min
                            ? `${s.target_duration_min}m`
                            : "";
                      const dist = s.target_distance_km ? ` ${s.target_distance_km}km` : "";
                      const blockCount = s.blocks?.length ?? 0;
                      return (
                        <li key={i}>
                          · <span className="font-mono">{s.date}</span> <strong>{s.sport}</strong>
                          {s.title ? ` · ${s.title}` : ""}
                          {dur ? ` · ${dur}` : ""}
                          {dist}
                          {s.target_intensity ? ` · ${s.target_intensity}` : ""}
                          {blockCount > 0 ? ` · ${blockCount} block` : ""}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
              <p className="mt-2 rounded bg-white/50 px-2 py-1 text-[10px] text-green-900 dark:bg-zinc-900/50 dark:text-green-200">
                💡 Program disimpan sebagai <strong>draft</strong>. Setelah simpan kamu diarahkan ke halaman program — bisa edit sesi, tambah fase, aktifkan program.
              </p>
            </div>
          )}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending || !preview || "error" in preview}
          onClick={() => {
            if (!preview || "error" in preview) return;
            start(async () => {
              setMsg(null);
              setErr(null);
              const res = await applyPlanImportAction(
                preview.parsed,
                targetProgramId ? { targetProgramId } : {},
              );
              if (res.ok) {
                setMsg(res.message ?? "Berhasil");
                // Land in the program detail so user can review + edit + activate.
                // Falls back to /today for orphan sessions (no program at all).
                const landingProgramId = targetProgramId || res.data.programId;
                setTimeout(
                  () => router.push(landingProgramId ? `/programs/${landingProgramId}` : "/today"),
                  600,
                );
              } else {
                setErr(res.error.message);
              }
            });
          }}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Menyimpan…" : "Simpan plan"}
        </button>
        {msg ? <span className="text-xs text-green-600">{msg}</span> : null}
        {err ? <span className="text-xs text-red-600">{err}</span> : null}
      </div>
    </div>
  );
}

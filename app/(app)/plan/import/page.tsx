import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProgram, listPrograms } from "@/lib/services/programs";
import { AiWorkflowStepper } from "@/app/_components/ai-workflow";
import { PROGRAM_PROMPT, SESSIONS_PROMPT } from "@/lib/prompts";
import { PlanImportForm } from "./plan-import-form";

export const metadata = { title: "Import plan · on-the-run" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ programId?: string; mode?: "program" | "sessions" }>;

const SESSIONS_EXAMPLE = `{
  "schema": "plan",
  "version": 1,
  "sessions": [
    {
      "date": "2026-10-06",
      "sport": "run",
      "session_type": "easy",
      "title": "Easy Run",
      "target_duration_min": 30,
      "target_duration_max": 35,
      "target_intensity": "Z1-Z2",
      "blocks": [
        { "name": "Main", "items": [{ "name": "Easy jog", "duration_sec": 1800, "target": "HR 139-154" }] }
      ]
    }
  ]
}`;

const PROGRAM_EXAMPLE = `{
  "schema": "plan",
  "version": 1,
  "program": {
    "name": "HM 2027 Preparation",
    "type": "main",
    "goal": "Sub-2:45 at February 2027 race",
    "start_date": "2026-10-05",
    "end_date": "2027-02-15"
  },
  "phases": [
    { "name": "Base", "start_date": "2026-10-05", "end_date": "2026-11-30", "focus": "Aerobic base" },
    { "name": "Build", "start_date": "2026-12-01", "end_date": "2027-01-11", "focus": "Threshold" },
    { "name": "Peak", "start_date": "2027-01-12", "end_date": "2027-02-01", "focus": "Race pace" },
    { "name": "Taper", "start_date": "2027-02-02", "end_date": "2027-02-15", "focus": "Freshness" }
  ],
  "sessions": []
}`;

export default async function PlanImportPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { programId, mode } = await searchParams;
  const programs = await listPrograms(user.id);

  // Auto-pick mode: if programId passed, we're adding sessions to it.
  const effectiveMode: "program" | "sessions" =
    mode ?? (programId ? "sessions" : "program");

  const targetProgram = programId
    ? await getProgram(user.id, programId)
    : null;

  const isSessionsMode = effectiveMode === "sessions";
  const prompt = isSessionsMode ? SESSIONS_PROMPT : PROGRAM_PROMPT;
  const example = isSessionsMode ? SESSIONS_EXAMPLE : PROGRAM_EXAMPLE;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Import</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isSessionsMode ? "Tambah sesi (JSON)" : "Bikin program lengkap (JSON)"}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {isSessionsMode && targetProgram ? (
            <>
              Sesi akan masuk ke program <strong>{targetProgram.name}</strong>. Pakai AI kamu
              untuk convert plan mingguan ke JSON, lalu paste di sini.
            </>
          ) : isSessionsMode ? (
            <>
              Tambah sesi (bisa ke program yang sudah ada atau sesi lepas). Pilih program tujuan
              di bawah.
            </>
          ) : (
            <>
              Bikin program baru lengkap dengan fase + sesi minggu pertama sekaligus. Program
              masuk dengan status <em>draft</em>, kamu aktifkan sendiri setelah dicek.
            </>
          )}
        </p>
      </header>

      {/* Mode toggle */}
      <nav aria-label="Mode import" className="flex gap-1.5 text-xs">
        <a
          href={`/plan/import?mode=program${programId ? "" : ""}`}
          className={`rounded-full px-3 py-1 font-medium ${
            !isSessionsMode
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          }`}
        >
          Program lengkap
        </a>
        <a
          href={`/plan/import?mode=sessions${programId ? `&programId=${programId}` : ""}`}
          className={`rounded-full px-3 py-1 font-medium ${
            isSessionsMode
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          }`}
        >
          Sesi saja
        </a>
      </nav>

      <AiWorkflowStepper
        prompt={prompt}
        promptLabel={isSessionsMode ? "Copy prompt sesi" : "Copy prompt program"}
        steps={[
          {
            title: "Copy prompt di atas",
            body: isSessionsMode
              ? "Prompt untuk generate sesi mingguan. Skip blok program/phases."
              : "Prompt untuk generate program lengkap: nama + goal + tanggal + phases + sesi.",
          },
          {
            title: "Paste ke AI + tempel data kamu",
            body: isSessionsMode
              ? "Bebas format: markdown, tabel, deskripsi hari per hari."
              : "Deskripsikan: race target, tanggal, current fitness, HR max, preferensi phase.",
          },
          {
            title: "Copy JSON dari AI",
            body: "AI output satu blok JSON valid. Copy semua.",
          },
          {
            title: "Paste di bawah + preview",
            body: "App validasi + tampilkan preview (jumlah sesi, phases, rentang tanggal). Simpan kalau OK.",
          },
        ]}
      />

      <PlanImportForm
        example={example}
        programs={programs.map((p) => ({ id: p.id, name: p.name, type: p.type, status: p.status }))}
        defaultTargetProgramId={programId ?? ""}
        lockTargetProgram={Boolean(targetProgram)}
      />
    </div>
  );
}

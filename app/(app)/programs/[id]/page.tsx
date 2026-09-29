import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { countProgramSessions, getProgram, listPrograms } from "@/lib/services/programs";
import { hydratedSessionsForProgram } from "@/lib/services/stats";
import { getRace } from "@/lib/services/races";
import { listPhases, phaseAt } from "@/lib/services/phases";
import { getProfile } from "@/lib/services/profiles";
import { todayInTz } from "@/lib/utils/dates";
import { fmtTanggalPendek } from "@/lib/utils/format";
import { computeProgramWeeks, fmtCountdown } from "@/lib/utils/program-weeks";
import { ProgramActions } from "./program-actions";
import { ProgramEditForm } from "./program-edit-form";
import { DeleteProgramButton } from "./delete-program-button";
import { PhasesSection } from "./phases-section";
import { WeekView } from "./week-view";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: `Program · on-the-run` };
}

export default async function ProgramDetailPage({ params }: { params: Params }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const program = await getProgram(user.id, id);
  if (!program) notFound();

  const profile = await getProfile(user.id);
  const today = todayInTz(profile?.timezone ?? "Asia/Jakarta");

  const [programSessions, phases, sessionCounts, otherActiveMain, goalRace, currentPhase] =
    await Promise.all([
      hydratedSessionsForProgram(user.id, program.id),
      listPhases(user.id, program.id),
      countProgramSessions(user.id, program.id),
      listPrograms(user.id).then((ps) =>
        ps.filter((p) => p.type === "main" && p.status === "active" && p.id !== program.id).at(0),
      ),
      program.goalRaceId ? getRace(user.id, program.goalRaceId) : Promise.resolve(null),
      phaseAt(user.id, program.id, today),
    ]);

  const weekGrid = computeProgramWeeks(program, programSessions, today);
  const initialWeekIdx =
    weekGrid.currentWeekIdx ?? weekGrid.weeks[0]?.idx ?? 1;

  // Compute countdown to race or program end
  const targetDate = goalRace?.date ?? program.endDate ?? null;
  const targetLabel = goalRace ? goalRace.name : program.endDate ? "selesai program" : null;

  return (
    <div className="space-y-6">
      <Link
        href="/programs"
        className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        ← Semua program
      </Link>

      {/* Sticky header */}
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {program.type === "main" ? "Main" : "Pendukung"}
          </span>
          <span className="text-xs text-zinc-500">Status: {program.status}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{program.name}</h1>
        {program.goal ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{program.goal}</p>
        ) : null}

        {/* Context line: W# / N, current phase, race countdown */}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
          {weekGrid.currentWeekIdx ? (
            <span>
              W{weekGrid.currentWeekIdx}{" "}
              <span className="text-zinc-400">dari {weekGrid.totalWeeks}</span>
            </span>
          ) : (
            <span>
              {weekGrid.totalWeeks} minggu total
            </span>
          )}
          {currentPhase ? (
            <span>
              · Fase:{" "}
              <span className="rounded-full bg-indigo-100 px-1.5 py-0 text-[10px] font-medium text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                {currentPhase.name}
              </span>{" "}
              <span className="text-zinc-400">
                ({fmtCountdown(today, currentPhase.endDate)} berakhir)
              </span>
            </span>
          ) : null}
          {targetDate ? (
            <span>
              · {targetLabel ?? "Target"}: {fmtTanggalPendek(targetDate)}{" "}
              <span className="text-zinc-400">({fmtCountdown(today, targetDate)})</span>
            </span>
          ) : null}
        </div>

        {program.notes ? (
          <p className="mt-2 whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-400">
            {program.notes}
          </p>
        ) : null}
      </header>

      <ProgramActions
        program={{ id: program.id, type: program.type, status: program.status }}
        otherActiveMainName={otherActiveMain?.name ?? null}
      />

      {/* Week grid — main content */}
      <section aria-labelledby="week-view">
        <div className="mb-3 flex items-baseline justify-between">
          <h2
            id="week-view"
            className="text-sm font-semibold uppercase tracking-wider text-zinc-500"
          >
            Sesi ({sessionCounts.total})
          </h2>
          <Link
            href={`/plan/import?mode=sessions&programId=${program.id}`}
            className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            + Sesi via AI (bulk)
          </Link>
        </div>
        <WeekView
          programId={program.id}
          weeks={weekGrid.weeks}
          initialWeekIdx={initialWeekIdx}
          phases={phases.map((p) => ({
            id: p.id,
            name: p.name,
            startDate: p.startDate,
            endDate: p.endDate,
          }))}
        />
      </section>

      {/* Phase management (collapsible-ish; just below week view) */}
      <PhasesSection programId={program.id} phases={phases} />

      {/* Program info edit */}
      <ProgramEditForm
        programId={program.id}
        initial={{
          name: program.name,
          type: program.type as "main" | "supporting",
          goal: program.goal ?? "",
          startDate: program.startDate ?? "",
          endDate: program.endDate ?? "",
          notes: program.notes ?? "",
        }}
      />

      <section className="pt-2">
        <DeleteProgramButton
          id={program.id}
          total={sessionCounts.total}
          locked={sessionCounts.locked}
        />
      </section>
    </div>
  );
}

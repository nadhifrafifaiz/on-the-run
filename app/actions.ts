"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ServiceError, isServiceError } from "@/lib/utils/errors";
import {
  activateProgram,
  archiveProgram,
  createProgram,
  deleteProgram,
  updateProgram,
} from "@/lib/services/programs";
import { addMetricsHistory } from "@/lib/services/metrics";
import { createPhase, deletePhase, updatePhase, type PhaseInput } from "@/lib/services/phases";
import { upsertProfile } from "@/lib/services/profiles";
import { applyImport, duplicateWeek } from "@/lib/services/plans";
import type { PlanImport } from "@/lib/schemas/plan-import";
import {
  createSession,
  markSession,
  deleteSession,
  duplicateSession,
  replaceSessionBlocks,
  updateSession,
} from "@/lib/services/sessions";
import type { PlannedSessionInput } from "@/lib/schemas/forms";
import { logActivity, updateActivityLog, deleteActivity } from "@/lib/services/activities";
import { createRace, updateRace, type RaceInput } from "@/lib/services/races";
import { createApiToken, revokeApiToken } from "@/lib/services/api-tokens";
import { createDraft, discardDraft } from "@/lib/services/drafts";
import { activityImportZ } from "@/lib/schemas/activity-import";
import { normalizePlanImport } from "@/lib/schemas/normalize";
import type {
  ProgramInput,
  ProfileInput,
  AthleteMetricsInput,
  ActivityLogInput,
} from "@/lib/schemas/forms";

export type ActionResult<T = null> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: { code: string; message: string } };

async function requireUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ServiceError("UNAUTHORIZED", "Login dulu.");
  return user.id;
}

function normalizeError(e: unknown): ActionResult<never> {
  if (isServiceError(e)) {
    return { ok: false, error: { code: e.code, message: e.message } };
  }
  return {
    ok: false,
    error: { code: "UNKNOWN", message: e instanceof Error ? e.message : "Terjadi kesalahan" },
  };
}

// -------------------- Programs --------------------

export async function activateProgramAction(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await activateProgram(userId, id);
    revalidatePath("/programs");
    revalidatePath(`/programs/${id}`);
    revalidatePath("/today");
    return { ok: true, data: null, message: "Program diaktifkan." };
  } catch (e) {
    return normalizeError(e);
  }
}

export async function archiveProgramAction(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await archiveProgram(userId, id);
    revalidatePath("/programs");
    revalidatePath(`/programs/${id}`);
    return { ok: true, data: null, message: "Program diarsipkan." };
  } catch (e) {
    return normalizeError(e);
  }
}

export async function createProgramAction(input: ProgramInput): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const row = await createProgram(userId, input);
    revalidatePath("/programs");
    return { ok: true, data: { id: row.id }, message: "Program dibuat." };
  } catch (e) {
    return normalizeError(e);
  }
}

export async function updateProgramAction(
  id: string,
  input: Partial<ProgramInput>,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await updateProgram(userId, id, input);
    revalidatePath("/programs");
    revalidatePath(`/programs/${id}`);
    return { ok: true, data: null, message: "Program disimpan." };
  } catch (e) {
    return normalizeError(e);
  }
}

export async function deleteProgramAction(
  id: string,
  opts: { deleteSessions?: boolean } = {},
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await deleteProgram(userId, id, opts);
    revalidatePath("/programs");
    revalidatePath("/today");
    return {
      ok: true,
      data: null,
      message: opts.deleteSessions
        ? "Program + semua sesi dihapus."
        : "Program dihapus. Sesi yang tertaut jadi sesi lepas.",
    };
  } catch (e) {
    return normalizeError(e);
  }
}

// -------------------- Phases --------------------

export async function createPhaseAction(
  input: PhaseInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const row = await createPhase(userId, input);
    revalidatePath(`/programs/${input.programId}`);
    return { ok: true, data: { id: row.id }, message: "Fase dibuat." };
  } catch (e) {
    return normalizeError(e);
  }
}

export async function updatePhaseAction(
  id: string,
  input: Partial<PhaseInput> & { programId: string },
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await updatePhase(userId, id, input);
    revalidatePath(`/programs/${input.programId}`);
    return { ok: true, data: null, message: "Fase disimpan." };
  } catch (e) {
    return normalizeError(e);
  }
}

export async function deletePhaseAction(id: string, programId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await deletePhase(userId, id);
    revalidatePath(`/programs/${programId}`);
    return { ok: true, data: null, message: "Fase dihapus." };
  } catch (e) {
    return normalizeError(e);
  }
}

// -------------------- Sessions --------------------

export async function createSessionAction(
  input: PlannedSessionInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const row = await createSession(userId, input);
    revalidatePath("/today");
    revalidatePath(`/week/${input.date}`);
    if (input.programId) revalidatePath(`/programs/${input.programId}`);
    return { ok: true, data: { id: row.id }, message: "Sesi dibuat." };
  } catch (e) {
    return normalizeError(e);
  }
}

export async function updateSessionAction(
  id: string,
  input: Partial<PlannedSessionInput>,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await updateSession(userId, id, input);
    // If the caller included blocks, replace them too (edit blocks flow).
    if (input.blocks !== undefined) {
      await replaceSessionBlocks(userId, id, input.blocks);
    }
    revalidatePath("/today");
    revalidatePath(`/sessions/${id}`);
    if (input.date) revalidatePath(`/week/${input.date}`);
    if (input.programId) revalidatePath(`/programs/${input.programId}`);
    return { ok: true, data: null, message: "Sesi disimpan." };
  } catch (e) {
    return normalizeError(e);
  }
}

export async function duplicateSessionAction(
  sourceId: string,
  targetDate: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const row = await duplicateSession(userId, sourceId, targetDate);
    revalidatePath("/today");
    revalidatePath(`/week/${targetDate}`);
    return { ok: true, data: row, message: `Sesi digandakan ke ${targetDate}.` };
  } catch (e) {
    return normalizeError(e);
  }
}

export async function markSessionAction(
  id: string,
  status: "planned" | "done" | "skipped" | "modified",
  note?: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await markSession(userId, id, status, note);
    revalidatePath("/today");
    return { ok: true, data: null };
  } catch (e) {
    return normalizeError(e);
  }
}

export async function deleteSessionAction(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await deleteSession(userId, id);
    revalidatePath("/today");
    return { ok: true, data: null };
  } catch (e) {
    return normalizeError(e);
  }
}

// -------------------- Plans --------------------

export async function duplicateWeekAction(
  from: string,
  to: string,
): Promise<ActionResult<{ copied: number }>> {
  try {
    const userId = await requireUserId();
    const res = await duplicateWeek(userId, from, to);
    revalidatePath(`/week/${to}`);
    return { ok: true, data: res, message: `${res.copied} sesi disalin.` };
  } catch (e) {
    return normalizeError(e);
  }
}

export async function applyPlanImportAction(
  input: PlanImport,
  opts: { targetProgramId?: string } = {},
): Promise<
  ActionResult<{
    sessionsInserted: number;
    weekNotesInserted: number;
    phasesInserted: number;
    programId: string | null;
  }>
> {
  try {
    const userId = await requireUserId();
    const res = await applyImport(userId, input, opts);
    revalidatePath("/today");
    revalidatePath("/programs");
    if (res.programId) revalidatePath(`/programs/${res.programId}`);
    const parts: string[] = [];
    parts.push(`${res.sessionsInserted} sesi`);
    if (res.phasesInserted > 0) parts.push(`${res.phasesInserted} fase`);
    if (res.weekNotesInserted > 0) parts.push(`${res.weekNotesInserted} catatan minggu`);
    return {
      ok: true,
      data: res,
      message: `${parts.join(" + ")} tersimpan.`,
    };
  } catch (e) {
    return normalizeError(e);
  }
}

// -------------------- Profile --------------------

export async function updateProfileAction(input: ProfileInput): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await upsertProfile(userId, input);
    revalidatePath("/settings");
    return { ok: true, data: null, message: "Profil disimpan." };
  } catch (e) {
    return normalizeError(e);
  }
}

// -------------------- Activities --------------------

export async function logActivityAction(
  input: ActivityLogInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const row = await logActivity(userId, input);
    revalidatePath("/today");
    revalidatePath("/activities");
    return { ok: true, data: { id: row.id }, message: "Aktivitas tercatat." };
  } catch (e) {
    return normalizeError(e);
  }
}

export async function createDraftFromJsonAction(
  rawInput: string,
): Promise<ActionResult<{ draftId: string }>> {
  try {
    const userId = await requireUserId();
    // Extract the first JSON object from raw text.
    const trimmed = rawInput.trim();
    const jsonStr = trimmed.startsWith("{") ? trimmed : (trimmed.match(/\{[\s\S]*\}/)?.[0] ?? "");
    if (!jsonStr) {
      throw new ServiceError("VALIDATION", "Tidak ada blok JSON ditemukan.");
    }
    let parsed: unknown;
    try {
      parsed = normalizePlanImport(JSON.parse(jsonStr));
    } catch (e) {
      throw new ServiceError(
        "VALIDATION",
        `JSON tidak valid: ${e instanceof Error ? e.message : "unknown"}`,
      );
    }
    const check = activityImportZ.safeParse(parsed);
    if (!check.success) {
      throw new ServiceError(
        "VALIDATION",
        `Schema salah: ${check.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .slice(0, 3)
          .join("; ")}`,
      );
    }
    const draft = await createDraft(userId, "json", check.data);
    revalidatePath("/today");
    return { ok: true, data: { draftId: draft.id }, message: "Draft dibuat." };
  } catch (e) {
    return normalizeError(e);
  }
}

export async function discardDraftAction(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await discardDraft(userId, id);
    revalidatePath("/today");
    return { ok: true, data: null, message: "Draft dibuang." };
  } catch (e) {
    return normalizeError(e);
  }
}

export async function updateActivityAction(
  id: string,
  input: ActivityLogInput,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await updateActivityLog(userId, id, input);
    revalidatePath("/activities");
    revalidatePath(`/activities/${id}`);
    revalidatePath("/today");
    return { ok: true, data: null, message: "Aktivitas disimpan." };
  } catch (e) {
    return normalizeError(e);
  }
}

export async function deleteActivityAction(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await deleteActivity(userId, id);
    revalidatePath("/activities");
    revalidatePath("/today");
    return { ok: true, data: null, message: "Aktivitas dihapus." };
  } catch (e) {
    return normalizeError(e);
  }
}

// -------------------- Metrics --------------------

export async function addMetricsAction(input: AthleteMetricsInput): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await addMetricsHistory(userId, input);
    revalidatePath("/settings");
    return { ok: true, data: null, message: "Metrik disimpan." };
  } catch (e) {
    return normalizeError(e);
  }
}

// -------------------- Races --------------------

export async function createRaceAction(
  input: RaceInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const row = await createRace(userId, input);
    revalidatePath("/races");
    return { ok: true, data: { id: row.id }, message: "Race dibuat." };
  } catch (e) {
    return normalizeError(e);
  }
}

export async function updateRaceAction(
  id: string,
  input: Partial<RaceInput>,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await updateRace(userId, id, input);
    revalidatePath("/races");
    revalidatePath(`/races/${id}`);
    return { ok: true, data: null, message: "Race disimpan." };
  } catch (e) {
    return normalizeError(e);
  }
}

// -------------------- API tokens (widgets) --------------------

export async function createApiTokenAction(
  name: string,
): Promise<ActionResult<{ token: string; prefix: string }>> {
  try {
    const userId = await requireUserId();
    const { token, row } = await createApiToken(userId, name);
    revalidatePath("/settings");
    return {
      ok: true,
      data: { token, prefix: row.tokenPrefix },
      message: "Token dibuat. Salin sekarang — tidak akan ditampilkan lagi.",
    };
  } catch (e) {
    return normalizeError(e);
  }
}

export async function revokeApiTokenAction(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await revokeApiToken(userId, id);
    revalidatePath("/settings");
    return { ok: true, data: null, message: "Token dicabut." };
  } catch (e) {
    return normalizeError(e);
  }
}

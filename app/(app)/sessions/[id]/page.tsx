import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/services/sessions";
import { listPrograms } from "@/lib/services/programs";
import { SessionForm } from "../_components/session-form";
import { DeleteSessionButton } from "./delete-session-button";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "Sesi · on-the-run" };
}

export default async function SessionDetailPage({ params }: { params: Params }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const data = await getSession(user.id, id);
  if (!data) notFound();

  const { session } = data;
  const programs = await listPrograms(user.id);

  return (
    <div className="space-y-6">
      <Link
        href="/today"
        className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        ← Kembali
      </Link>

      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Edit sesi
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {session.title ?? session.sport}
        </h1>
        <p className="text-sm text-zinc-500">{session.date}</p>
      </header>

      {session.activityId ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900/40 dark:bg-blue-950/30">
          <p className="text-blue-900 dark:text-blue-200">
            Sesi ini sudah tertaut ke <Link href={`/activities/${session.activityId}`} className="underline">aktivitas tercatat</Link>. Kamu masih bisa edit target/notes, tapi tidak bisa hapus tanpa hapus aktivitasnya dulu.
          </p>
        </div>
      ) : null}

      <SessionForm
        mode="edit"
        sessionId={session.id}
        programs={programs.map((p) => ({ id: p.id, name: p.name, status: p.status }))}
        initial={{
          date: session.date,
          programId: session.programId,
          sport: session.sport,
          sessionType: session.sessionType,
          title: session.title,
          description: session.description,
          targetDurationMinMin: session.targetDurationMinSec
            ? Math.round(session.targetDurationMinSec / 60)
            : null,
          targetDurationMaxMin: session.targetDurationMaxSec
            ? Math.round(session.targetDurationMaxSec / 60)
            : null,
          targetDistanceKm: session.targetDistanceM ? session.targetDistanceM / 1000 : null,
          targetIntensity: session.targetIntensity,
          status: session.status as "planned" | "done" | "skipped" | "modified",
          statusNote: session.statusNote,
          blocks: data.blocks.map((b) => ({
            name: b.name ?? "",
            rounds: String(b.rounds ?? 1),
            notes: b.notes ?? "",
            items: b.items.map((i) => ({
              name: i.name,
              sets: i.sets != null ? String(i.sets) : "",
              reps: i.reps != null ? String(i.reps) : "",
              durationSec: i.durationSec != null ? String(i.durationSec) : "",
              distanceM: i.distanceM != null ? String(i.distanceM) : "",
              loadKg: i.loadKg != null ? String(i.loadKg) : "",
              restSec: i.restSec != null ? String(i.restSec) : "",
              target: i.target ?? "",
              notes: i.notes ?? "",
            })),
          })),
        }}
      />

      <div className="pt-2">
        <DeleteSessionButton id={session.id} locked={session.activityId !== null} />
      </div>
    </div>
  );
}

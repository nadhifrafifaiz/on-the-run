import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listPrograms } from "@/lib/services/programs";
import { toIsoDate } from "@/lib/utils/dates";
import { SessionForm } from "../_components/session-form";

export const metadata = { title: "Sesi baru · on-the-run" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ date?: string; programId?: string }>;

export default async function NewSessionPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { date, programId } = await searchParams;
  const programs = await listPrograms(user.id);
  const activeMain = programs.find((p) => p.type === "main" && p.status === "active");

  return (
    <div className="space-y-6">
      <Link
        href="/today"
        className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        ← Kembali
      </Link>

      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Sesi baru</p>
        <h1 className="text-2xl font-semibold tracking-tight">Tambah sesi rencana</h1>
      </header>

      <SessionForm
        mode="create"
        programs={programs.map((p) => ({ id: p.id, name: p.name, status: p.status }))}
        initial={{
          date: date ?? toIsoDate(new Date()),
          programId: programId ?? activeMain?.id ?? null,
          sport: "run",
          sessionType: null,
          title: null,
          description: null,
          targetDurationMinMin: null,
          targetDurationMaxMin: null,
          targetDistanceKm: null,
          targetIntensity: null,
          status: "planned",
          statusNote: null,
          blocks: [],
        }}
      />
    </div>
  );
}

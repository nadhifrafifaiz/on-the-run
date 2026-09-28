import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRace } from "@/lib/services/races";
import { RaceForm } from "../../_components/race-form";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit race · on-the-run" };

function secToTime(sec: number | null): string {
  if (sec == null) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export default async function EditRacePage({ params }: { params: Params }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const race = await getRace(user.id, id);
  if (!race) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`/races/${id}`}
        className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        ← Batal
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Edit</p>
        <h1 className="text-2xl font-semibold tracking-tight">{race.name}</h1>
      </header>

      <RaceForm
        mode="edit"
        raceId={id}
        initial={{
          name: race.name,
          date: race.date,
          location: race.location ?? "",
          distanceKm: race.distanceM ? String(race.distanceM / 1000) : "",
          distanceLabel: race.distanceLabel ?? "",
          status: race.status as "planned" | "done" | "dns" | "dnf",
          targetTimeMs: secToTime(race.targetTimeSec),
          chipTimeMs: secToTime(race.chipTimeSec),
          watchTimeMs: secToTime(race.watchTimeSec),
          rankOverall: race.rankOverall != null ? String(race.rankOverall) : "",
          totalOverall: race.totalOverall != null ? String(race.totalOverall) : "",
          rankGender: race.rankGender != null ? String(race.rankGender) : "",
          totalGender: race.totalGender != null ? String(race.totalGender) : "",
          rankCategory: race.rankCategory != null ? String(race.rankCategory) : "",
          totalCategory: race.totalCategory != null ? String(race.totalCategory) : "",
          strategy: race.strategy ?? "",
          report: race.report ?? "",
        }}
      />
    </div>
  );
}

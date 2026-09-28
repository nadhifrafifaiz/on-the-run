import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toIsoDate } from "@/lib/utils/dates";
import { RaceForm } from "../_components/race-form";

export const metadata = { title: "Race baru · on-the-run" };
export const dynamic = "force-dynamic";

export default async function NewRacePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <Link
        href="/races"
        className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        ← Semua race
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Race baru</p>
        <h1 className="text-2xl font-semibold tracking-tight">Daftar race</h1>
      </header>

      <RaceForm
        mode="create"
        initial={{
          name: "",
          date: toIsoDate(new Date()),
          location: "",
          distanceKm: "",
          distanceLabel: "",
          status: "planned",
          targetTimeMs: "",
          chipTimeMs: "",
          watchTimeMs: "",
          rankOverall: "",
          totalOverall: "",
          rankGender: "",
          totalGender: "",
          rankCategory: "",
          totalCategory: "",
          strategy: "",
          report: "",
        }}
      />
    </div>
  );
}

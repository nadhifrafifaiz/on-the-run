import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hydratedSessions } from "@/lib/services/stats";
import { getProfile } from "@/lib/services/profiles";
import { toIsoDate, todayInTz } from "@/lib/utils/dates";
import { LogActivityForm } from "../../_components/log-activity-form";
import { prefillFromPlannedSession } from "../../_components/prefill-from-planned";

export const metadata = { title: "Review · on-the-run" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ plannedSessionId?: string }>;

export default async function LogReviewNewPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { plannedSessionId } = await searchParams;
  const profile = await getProfile(user.id);
  const today = todayInTz(profile?.timezone ?? "Asia/Jakarta");

  // Give options for today ± 2 days.
  const from = new Date();
  from.setDate(from.getDate() - 2);
  const to = new Date();
  to.setDate(to.getDate() + 2);
  const sessions = await hydratedSessions(user.id, toIsoDate(from), toIsoDate(to));

  const sessionOptions = sessions
    .filter((s) => s.session.status === "planned")
    .map((s) => ({
      id: s.session.id,
      date: s.session.date,
      label: `${s.session.date} — ${s.session.title ?? s.session.sport} (${s.session.sport})`,
      sport: s.session.sport,
    }));

  const preselected = plannedSessionId
    ? sessions.find((s) => s.session.id === plannedSessionId)
    : null;

  // If linked from a planned session, pre-fill date/sport/title AND expand
  // planned blocks + items into activity items+sets so user sees gerakan-nya.
  const prefill = preselected ? prefillFromPlannedSession(preselected) : undefined;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Review</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {preselected
            ? `Log: ${preselected.session.title ?? preselected.session.sport}`
            : "Log aktivitas"}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Cek isian, isi RPE + Feel, lalu simpan.
        </p>
      </header>
      <LogActivityForm defaultDate={today} sessionOptions={sessionOptions} prefill={prefill} />
    </div>
  );
}

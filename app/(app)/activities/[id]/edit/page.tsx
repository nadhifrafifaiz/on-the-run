import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getHydratedActivity } from "@/lib/services/activities";
import { hydratedSessions } from "@/lib/services/stats";
import { getProfile } from "@/lib/services/profiles";
import { toIsoDate, todayInTz } from "@/lib/utils/dates";
import { LogActivityForm } from "@/app/(app)/log/_components/log-activity-form";
import { prefillFromActivity } from "@/app/(app)/log/_components/prefill-from-activity";

type Params = Promise<{ id: string }>;
export const dynamic = "force-dynamic";
export const metadata = { title: "Edit aktivitas · on-the-run" };

export default async function EditActivityPage({ params }: { params: Params }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const data = await getHydratedActivity(user.id, id);
  if (!data) notFound();

  const prefill = prefillFromActivity(data);

  // Planned session options near activity date (for the "tautkan" dropdown).
  const centerDate = new Date(data.activity.date);
  const from = new Date(centerDate);
  from.setDate(from.getDate() - 2);
  const to = new Date(centerDate);
  to.setDate(to.getDate() + 2);
  const sessions = await hydratedSessions(user.id, toIsoDate(from), toIsoDate(to));
  const sessionOptions = sessions
    .filter((s) => s.session.status === "planned" || s.session.id === data.activity.plannedSessionId)
    .map((s) => ({
      id: s.session.id,
      date: s.session.date,
      label: `${s.session.date} — ${s.session.title ?? s.session.sport} (${s.session.sport})`,
      sport: s.session.sport,
    }));

  const profile = await getProfile(user.id);
  const today = todayInTz(profile?.timezone ?? "Asia/Jakarta");

  return (
    <div className="space-y-6">
      <Link
        href={`/activities/${id}`}
        className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        ← Batal / lihat detail
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Edit</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {data.activity.title ?? data.activity.sport}
        </h1>
        <p className="text-sm text-zinc-500">{data.activity.date}</p>
      </header>

      <LogActivityForm
        defaultDate={today}
        sessionOptions={sessionOptions}
        prefill={prefill}
        editActivityId={id}
      />
    </div>
  );
}

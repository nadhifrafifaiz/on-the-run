import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDraft } from "@/lib/services/drafts";
import { hydratedSessions } from "@/lib/services/stats";
import { getProfile } from "@/lib/services/profiles";
import { activityImportZ } from "@/lib/schemas/activity-import";
import { toIsoDate, todayInTz } from "@/lib/utils/dates";
import { LogActivityForm } from "../../_components/log-activity-form";
import { prefillFromActivityImport } from "../../_components/prefill-from-import";
import { DiscardDraftButton } from "./discard-draft-button";

export const metadata = { title: "Review draft · on-the-run" };
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function LogReviewDraftPage({ params }: { params: Params }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const draft = await getDraft(user.id, id);
  if (!draft) notFound();

  // Parse the payload back through the import schema so we're strict about shape.
  const parsed = activityImportZ.safeParse(draft.payload);
  if (!parsed.success) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Draft tidak valid</h1>
        <p className="text-sm text-red-600">
          Payload draft tidak cocok dengan schema activity v1:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
          {parsed.error.issues.slice(0, 5).map((iss, i) => (
            <li key={i}>
              <code>{iss.path.join(".")}</code>: {iss.message}
            </li>
          ))}
        </ul>
        <DiscardDraftButton id={draft.id} />
      </div>
    );
  }

  const prefill = prefillFromActivityImport(parsed.data);
  const profile = await getProfile(user.id);
  const today = todayInTz(profile?.timezone ?? "Asia/Jakarta");

  // Find candidate planned sessions near the draft date.
  const centerDate = new Date(parsed.data.date);
  const from = new Date(centerDate);
  from.setDate(from.getDate() - 2);
  const to = new Date(centerDate);
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

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Review draft — {draft.source.toUpperCase()}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {parsed.data.title ?? `${parsed.data.sport} · ${parsed.data.date}`}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Field di bawah sudah pre-fill dari draft. Ubah yang perlu, isi RPE + Feel, lalu simpan.
        </p>
      </header>

      <LogActivityForm
        defaultDate={today}
        sessionOptions={sessionOptions}
        prefill={prefill}
        draftId={draft.id}
      />

      <div className="pt-2">
        <DiscardDraftButton id={draft.id} />
      </div>
    </div>
  );
}

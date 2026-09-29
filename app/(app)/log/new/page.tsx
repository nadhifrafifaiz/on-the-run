import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listPending } from "@/lib/services/drafts";
import { hydratedSessions } from "@/lib/services/stats";
import { getProfile } from "@/lib/services/profiles";
import { todayInTz } from "@/lib/utils/dates";
import { fmtHari, fmtSport, fmtTanggalPendek } from "@/lib/utils/format";
import { AiWorkflowStepper } from "@/app/_components/ai-workflow";
import { ACTIVITY_PROMPT } from "@/lib/prompts";
import { JsonPasteForm } from "./json-paste-form";

export const metadata = { title: "Log baru · on-the-run" };
export const dynamic = "force-dynamic";

export default async function LogNewPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile(user.id);
  const today = todayInTz(profile?.timezone ?? "Asia/Jakarta");
  const [drafts, todaySessions] = await Promise.all([
    listPending(user.id),
    hydratedSessions(user.id, today, today),
  ]);
  const plannedToday = todaySessions.filter((s) => s.session.status === "planned");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Log</p>
        <h1 className="text-2xl font-semibold tracking-tight">Catat aktivitas</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Semua jalur berakhir di layar review — cek dulu sebelum simpan.
        </p>
      </header>

      {/* Jalur 1: Manual */}
      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-1 text-sm font-medium">1. Manual</h2>
        <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-400">
          Isi form kosong dari nol.
        </p>
        <Link
          href="/log/review/new"
          className="inline-block rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Buka form kosong →
        </Link>
      </section>

      {/* Jalur 2: dari planned session */}
      {plannedToday.length > 0 ? (
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-1 text-sm font-medium">2. Dari sesi rencana hari ini</h2>
          <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-400">
            Form akan pre-fill dengan sport + target dari plan.
          </p>
          <ul className="space-y-1.5">
            {plannedToday.map((s) => (
              <li key={s.session.id}>
                <Link
                  href={`/log/review/new?plannedSessionId=${s.session.id}`}
                  className="block rounded-md border border-zinc-200 px-3 py-2 text-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  <span className="font-medium">
                    {s.session.title ?? fmtSport(s.session.sport)}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500">
                    ({fmtSport(s.session.sport)})
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Jalur 3: Paste JSON */}
      <section className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div>
          <h2 className="mb-1 text-sm font-medium">
            {plannedToday.length > 0 ? "3." : "2."} Paste JSON dari AI / Claude
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Pakai AI kamu sendiri (Claude / ChatGPT / Gemini) untuk convert screenshot ke JSON,
            lalu paste hasilnya di sini.
          </p>
        </div>
        <AiWorkflowStepper
          prompt={ACTIVITY_PROMPT}
          promptLabel="Copy prompt aktivitas"
          steps={[
            {
              title: "Copy prompt di atas",
              body: "Sudah include schema + rules. Tempel ke Claude / ChatGPT / AI mana aja.",
            },
            {
              title: "Attach screenshot watch (Huawei Health / Strava / Garmin)",
              body: "Atau deskripsikan aktivitas kamu di bawah prompt.",
            },
            {
              title: "Copy JSON dari AI",
              body: "Copy blok JSON yang dihasilkan.",
            },
            {
              title: "Paste di sini + review",
              body: "App validasi otomatis. Kamu isi RPE + Feel di layar review sebelum simpan.",
            },
          ]}
        />
        <JsonPasteForm />
      </section>

      {/* Jalur 4: pending drafts */}
      {drafts.length > 0 ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <h2 className="mb-1 text-sm font-medium text-amber-900 dark:text-amber-200">
            {drafts.length} draft menunggu review
          </h2>
          <ul className="mt-2 space-y-1.5">
            {drafts.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/log/review/${d.id}`}
                  className="block rounded-md border border-amber-200 bg-white px-3 py-2 text-sm transition hover:border-amber-300 dark:border-amber-900/40 dark:bg-zinc-900"
                >
                  <span className="font-medium">Draft {d.source.toUpperCase()}</span>
                  <span className="ml-2 text-xs text-zinc-500">
                    · dibuat {fmtHari(d.createdAt.toISOString().slice(0, 10))}{" "}
                    {fmtTanggalPendek(d.createdAt.toISOString().slice(0, 10))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

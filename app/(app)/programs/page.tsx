import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listPrograms } from "@/lib/services/programs";
import { fmtTanggalPendek } from "@/lib/utils/format";
import { CreateProgramForm } from "./create-program-form";

export const metadata = { title: "Program · on-the-run" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  active: "Aktif",
  completed: "Selesai",
  archived: "Diarsipkan",
};

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  active: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  archived: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
};

export default async function ProgramsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const programs = await listPrograms(user.id);
  const main = programs.filter((p) => p.type === "main");
  const supporting = programs.filter((p) => p.type === "supporting");
  const archived = programs.filter((p) => p.status === "archived");

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Program</p>
        <h1 className="text-2xl font-semibold tracking-tight">Semua program</h1>
      </header>

      <ProgramSection title="Main" items={main.filter((p) => p.status !== "archived")} />
      <ProgramSection title="Pendukung" items={supporting.filter((p) => p.status !== "archived")} />

      {archived.length > 0 ? (
        <ProgramSection title="Arsip" items={archived} muted />
      ) : null}

      <section className="rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
        <h2 className="mb-2 text-sm font-medium">Buat program manual (nama + tipe)</h2>
        <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-400">
          Untuk program simple. Kamu bisa isi fase + sesi setelahnya.
        </p>
        <CreateProgramForm />
      </section>

      <section className="rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
        <h2 className="mb-1 text-sm font-medium">Bikin program lengkap via AI</h2>
        <p className="mb-2 text-xs text-zinc-600 dark:text-zinc-400">
          Rancang program utuh (nama + goal + tanggal + fase + sesi minggu pertama) lewat Claude/AI.
          Program masuk sebagai <em>draft</em>, kamu aktifkan setelah dicek.
        </p>
        <Link
          href="/plan/import?mode=program"
          className="inline-block rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Buka helper AI →
        </Link>
      </section>
    </div>
  );
}

function ProgramSection({
  title,
  items,
  muted,
}: {
  title: string;
  items: Array<{
    id: string;
    name: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    goal: string | null;
  }>;
  muted?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2
        className={`mb-2 text-xs font-semibold uppercase tracking-wider ${muted ? "text-zinc-400" : "text-zinc-500"}`}
      >
        {title}
      </h2>
      <ul className="space-y-2">
        {items.map((p) => (
          <li key={p.id}>
            <Link
              href={`/programs/${p.id}`}
              className={`block rounded-lg border p-3 transition ${
                muted
                  ? "border-zinc-200 opacity-70 hover:opacity-100 dark:border-zinc-800"
                  : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{p.name}</span>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[p.status] ?? STATUS_STYLE.draft}`}
                    >
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>
                  {p.goal ? <p className="mt-0.5 text-xs text-zinc-500">{p.goal}</p> : null}
                  {(p.startDate || p.endDate) && (
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {p.startDate ? fmtTanggalPendek(p.startDate) : "?"} –{" "}
                      {p.endDate ? fmtTanggalPendek(p.endDate) : "?"}
                    </p>
                  )}
                </div>
                <span className="text-zinc-400">→</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

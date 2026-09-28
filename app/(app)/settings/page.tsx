import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/services/profiles";
import { listMetricsHistory } from "@/lib/services/metrics";
import { fmtTanggalPendek } from "@/lib/utils/format";
import { ProfileForm } from "./profile-form";
import { AddMetricsForm } from "./add-metrics-form";

export const metadata = { title: "Setelan · on-the-run" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, metrics] = await Promise.all([
    getProfile(user.id),
    listMetricsHistory(user.id),
  ]);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Setelan</p>
        <h1 className="text-2xl font-semibold tracking-tight">Profil & metrik</h1>
      </header>

      <section aria-labelledby="profil" className="space-y-3">
        <h2 id="profil" className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Profil
        </h2>
        <ProfileForm
          initial={{
            displayName: profile?.displayName ?? "",
            timezone: profile?.timezone ?? "Asia/Jakarta",
            units: (profile?.units as "metric" | "imperial") ?? "metric",
            weekStart: (profile?.weekStart as "monday" | "sunday") ?? "monday",
          }}
        />
      </section>

      <section aria-labelledby="metrik" className="space-y-3">
        <h2 id="metrik" className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Riwayat metrik atlet
        </h2>
        {metrics.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">
            Belum ada metrik. Tambah baris pertama di bawah.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 text-left text-zinc-500 dark:bg-zinc-900">
                <tr>
                  <th className="px-3 py-2 font-medium">Berlaku sejak</th>
                  <th className="px-3 py-2 font-medium">Max HR</th>
                  <th className="px-3 py-2 font-medium">RHR</th>
                  <th className="px-3 py-2 font-medium">LTHR</th>
                  <th className="px-3 py-2 font-medium">VO2</th>
                  <th className="px-3 py-2 font-medium">Cadence</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="px-3 py-2">{fmtTanggalPendek(m.effectiveFrom)}</td>
                    <td className="px-3 py-2">{m.maxHr ?? "—"}</td>
                    <td className="px-3 py-2">{m.restingHr ?? "—"}</td>
                    <td className="px-3 py-2">{m.lthr ?? "—"}</td>
                    <td className="px-3 py-2">{m.vo2max ?? "—"}</td>
                    <td className="px-3 py-2">{m.targetCadenceSpm ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
          <h3 className="mb-3 text-sm font-medium">Tambah metrik baru</h3>
          <AddMetricsForm />
        </div>
      </section>

      <section
        aria-labelledby="lain"
        className="space-y-2 rounded-lg border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800"
      >
        <h2 id="lain" className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Nanti
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Widget token (M3)</li>
          <li>Connect Claude / MCP (M4)</li>
          <li>Export semua data & hapus akun (M5)</li>
        </ul>
      </section>
    </div>
  );
}

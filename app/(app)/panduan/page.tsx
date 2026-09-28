import Link from "next/link";
import { toIsoDate, weekStartOf } from "@/lib/utils/dates";

export const metadata = { title: "Panduan · on-the-run" };

type Status = "done" | "current" | "pending";

const milestones: Array<{ id: string; title: string; status: Status; note: string }> = [
  {
    id: "M0",
    title: "Fondasi",
    status: "done",
    note: "Next.js, Supabase, Google login, Drizzle terhubung.",
  },
  {
    id: "M1a",
    title: "Skema data & service layer",
    status: "done",
    note: "15 tabel + RLS, 10 service module, 19 tes kepemilikan hijau.",
  },
  {
    id: "M1b",
    title: "Migrasi Notion",
    status: "done",
    note: "70 aktivitas Run Log + 3 race (dengan report HM Bandung markdown) + metrik atlet berhasil masuk DB. Best Efforts cocok: 5K 32:06, HM 2:57:04.",
  },
  {
    id: "M2a",
    title: "UI baca-saja",
    status: "done",
    note: "Today, This Week, Programs list + detail, Settings (profil + metrik) — semua terhubung ke data.",
  },
  {
    id: "M2b",
    title: "Log flow + detail pages",
    status: "done",
    note: "/log/new chooser (manual / paste JSON / dari sesi rencana) → /log/review/[draftId] → simpan. Detail aktivitas + race + import plan JSON juga live.",
  },
  {
    id: "M2c",
    title: "Plan editor UI",
    status: "done",
    note: "Session form lengkap: block + item (name/sets/reps/duration/distance/load/rest/target). Fase CRUD di program detail. Delete program 2-step. Import JSON support fase + toggle mode.",
  },
  {
    id: "M2d",
    title: "Week grid view (upcoming)",
    status: "current",
    note: "Program detail dengan week tabs, past+current+future minggu, per-session copy actions (bulk copy dari minggu lalu, +% progress).",
  },
  {
    id: "M3",
    title: "Import, race, widget",
    status: "pending",
    note: "JSON import (done) / export (belum), tambah race dari UI, widget Scriptable iPhone.",
  },
  {
    id: "M4",
    title: "MCP & cut-over",
    status: "pending",
    note: "OAuth connector, tools import_activity + get_logging_context, Notion arsip.",
  },
  {
    id: "M5",
    title: "Siap untuk teman",
    status: "pending",
    note: "Onboarding lengkap, panduan connect Claude & widget, export & hapus akun.",
  },
];

type PageEntry = {
  path: string; // template shown in the label
  href?: string; // actual resolved link when clickable + dynamic
  name: string;
  status: Status;
  desc: string;
  clickable: boolean;
};

const monday = weekStartOf(toIsoDate(new Date()), "monday");

const pages: Array<PageEntry> = [
  {
    path: "/today",
    name: "Hari ini",
    status: "done",
    desc: "Sesi hari ini + ringkasan mingguan + draft pending, semua dari data live.",
    clickable: true,
  },
  {
    path: "/week/[date]",
    href: `/week/${monday}`,
    name: "Minggu ini",
    status: "done",
    desc: "7 hari kalender, rencana vs aktual per hari, catatan minggu, tombol duplikasi minggu.",
    clickable: true,
  },
  {
    path: "/programs",
    name: "Program",
    status: "done",
    desc: "List main + pendukung, buat baru, aktifkan atau arsipkan (main aktif dibatasi 1).",
    clickable: true,
  },
  {
    path: "/log/new",
    name: "Log aktivitas",
    status: "done",
    desc: "Chooser 3 jalur: manual / paste JSON / dari sesi rencana → semua ke layar review.",
    clickable: true,
  },
  {
    path: "/log/review/[id]",
    name: "Review draft",
    status: "done",
    desc: "Form pre-filled dari draft/JSON, isi RPE + Feel, tautkan sesi rencana, simpan.",
    clickable: false,
  },
  {
    path: "/activities",
    name: "Aktivitas",
    status: "done",
    desc: "List semua aktivitas dengan filter sport, buka detail per aktivitas.",
    clickable: true,
  },
  {
    path: "/activities/[id]",
    name: "Detail aktivitas",
    status: "done",
    desc: "Metrik lengkap, run_metrics, item + set, zona saat itu, catatan + coach notes, hapus.",
    clickable: false,
  },
  {
    path: "/races",
    name: "Race",
    status: "done",
    desc: "Best Efforts + race mendatang + riwayat. Buka detail race untuk report HM Bandung.",
    clickable: true,
  },
  {
    path: "/races/[id]",
    name: "Detail race",
    status: "done",
    desc: "Info race, chip/watch time, peringkat, strategi, aktivitas tertaut, report markdown.",
    clickable: false,
  },
  {
    path: "/plan/import",
    name: "Import plan (JSON)",
    status: "done",
    desc: "Paste JSON dari Claude/AI, preview & validasi, lalu simpan ke DB.",
    clickable: true,
  },
  {
    path: "/settings",
    name: "Setelan",
    status: "done",
    desc: "Profil, tambah + lihat riwayat metrik atlet. Widget/Connect/Export menyusul M3–M5.",
    clickable: true,
  },
  {
    path: "/panduan",
    name: "Panduan (halaman ini)",
    status: "done",
    desc: "Ringkasan progres, peta halaman, dan perintah developer.",
    clickable: true,
  },
];

const setupChecklist: Array<{ label: string; done: boolean; note?: string }> = [
  { label: "Supabase project terhubung", done: true },
  { label: "Migrasi database diterapkan (15 tabel + RLS)", done: true },
  { label: "Login Google jalan end-to-end", done: true },
  { label: "Seed data tersedia di database (npm run db:seed)", done: true },
  { label: "Google Cloud OAuth Client tersimpan di Supabase", done: true },
  {
    label: "⚠️ Rotasi password database (masih di transcript chat)",
    done: false,
    note: "Dashboard Supabase → Settings → Database → Reset database password.",
  },
];

const commands: Array<{ cmd: string; desc: string }> = [
  { cmd: "npm run dev", desc: "Jalankan dev server di http://localhost:3000" },
  { cmd: "npm test", desc: "Jalankan semua tes kepemilikan (Vitest, ~25 detik)" },
  { cmd: "npm run db:generate", desc: "Buat file migrasi baru dari perubahan db/schema.ts" },
  { cmd: "npm run db:migrate", desc: "Terapkan migrasi yang belum diterapkan ke Supabase" },
  { cmd: "npm run db:seed", desc: "Reset + isi ulang data dummy user pertama (⚠ hapus 70 aktivitas Notion)" },
  { cmd: "npm run db:studio", desc: "Buka Drizzle Studio (GUI database) di browser" },
  { cmd: "npm run notion:discover", desc: "Walk homepage Notion, inventori database & page" },
  { cmd: "npm run notion:inspect <pageId>", desc: "Dump blok satu page Notion untuk debug" },
  { cmd: "npm run notion:migrate", desc: "Dry-run migrasi Notion → Supabase" },
  { cmd: "npm run notion:migrate -- --commit", desc: "Commit migrasi (idempoten via extra_metrics.notion_id)" },
  { cmd: "npm run wipe:seed -- --commit", desc: "Hapus data seed dummy (aman untuk data Notion)" },
  { cmd: "npm run import:w1-recovery -- --commit", desc: "One-off: import W1 Recovery week dari Notion" },
  { cmd: "npm run fix:sport-from-title -- --commit", desc: "Re-label sport dari emoji title (🚴→cycling dll)" },
  { cmd: "npm run lint", desc: "ESLint" },
  { cmd: "npm run format", desc: "Prettier untuk seluruh repo" },
];

function StatusPill({ status }: { status: Status }) {
  const styles = {
    done: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    current: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    pending: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  } as const;
  const label = { done: "Selesai", current: "Sedang jalan", pending: "Nanti" }[status];
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[status]}`}>
      {label}
    </span>
  );
}

export default function PanduanPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Panduan</p>
        <h1 className="text-2xl font-semibold tracking-tight">Mulai dari sini</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Ringkasan cepat: apa yang sudah jadi, apa yang belum, dan tombol mana yang bisa kamu tekan
          hari ini.
        </p>
      </header>

      {/* Progres milestone */}
      <section aria-labelledby="progres">
        <h2 id="progres" className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Progres milestone
        </h2>
        <ol className="space-y-2">
          {milestones.map((m) => (
            <li
              key={m.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xs text-zinc-500">{m.id}</span>
                  <span className="font-medium">{m.title}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{m.note}</p>
              </div>
              <StatusPill status={m.status} />
            </li>
          ))}
        </ol>
      </section>

      {/* Setup checklist */}
      <section aria-labelledby="setup">
        <h2 id="setup" className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Setup
        </h2>
        <ul className="space-y-2">
          {setupChecklist.map((s) => (
            <li
              key={s.label}
              className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
            >
              <span
                aria-label={s.done ? "selesai" : "belum"}
                className={`mt-0.5 inline-block h-4 w-4 shrink-0 rounded-full border-2 ${
                  s.done
                    ? "border-green-600 bg-green-600"
                    : "border-amber-500 bg-transparent"
                }`}
              />
              <div>
                <p>{s.label}</p>
                {s.note ? (
                  <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">{s.note}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Peta halaman */}
      <section aria-labelledby="peta">
        <h2 id="peta" className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Peta halaman
        </h2>
        <ul className="space-y-2">
          {pages.map((p) => (
            <li
              key={p.path}
              className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    {p.clickable ? (
                      <Link
                        href={p.href ?? p.path}
                        className="font-medium underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-500"
                      >
                        {p.name}
                      </Link>
                    ) : (
                      <span className="font-medium text-zinc-500">{p.name}</span>
                    )}
                    <code className="text-[10px] text-zinc-500">{p.path}</code>
                  </div>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{p.desc}</p>
                </div>
                <StatusPill status={p.status} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Data yang sudah masuk */}
      <section aria-labelledby="data">
        <h2 id="data" className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Data yang sudah masuk DB
        </h2>
        <div className="space-y-3">
          <div className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
            <p className="mb-2 font-medium">Historis dari Notion:</p>
            <ul className="list-disc space-y-1 pl-5 text-zinc-600 dark:text-zinc-400">
              <li>70 aktivitas Run Log (Feb–Sep 2026) — HR, pace, cadence, GCT, balance semua lengkap. Termasuk 2 aktivitas cycling (Sept 26) yang udah di-relabel dari sport &lsquo;run&rsquo;.</li>
              <li>3 race: One Piece Fun Run · Salonpas 5K · Pocari HM Bandung. Report HM Bandung dalam markdown, tertaut ke aktivitas.</li>
              <li>1 baris metrik atlet dari Current Status: VO2 38, Z2 139–154 bpm, target cadence 180 (effective 2026-09-20).</li>
            </ul>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
            <p className="mb-2 font-medium">Live plan (bisa berubah sesuai edit-mu):</p>
            <ul className="list-disc space-y-1 pl-5 text-zinc-600 dark:text-zinc-400">
              <li>1 profil (Asia/Jakarta, metric, Senin)</li>
              <li>Program &amp; planned_sessions = apa yang kamu bikin (via /programs + /sessions/new + /plan/import)</li>
              <li>Draft plan HM 2027 belum ada — nunggu kamu bikin di /programs</li>
            </ul>
          </div>
          <p className="text-xs text-zinc-500">
            <strong>Best Efforts (dari data live):</strong> 5K 32:06 (Salonpas) · 10K 1:02:42 (Digiland) · HM 2:57:04 (Pocari Bandung).
          </p>
          <p className="text-xs text-zinc-500">
            Lihat semua via <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">npm run db:studio</code> atau di Today / Minggu / Aktivitas / Program.
          </p>
        </div>
      </section>

      {/* Yang belum ada */}
      <section aria-labelledby="gap">
        <h2 id="gap" className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Yang belum ada di app
        </h2>
        <ul className="space-y-2 text-sm">
          <li className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
            <strong>Week grid view (M2d — next).</strong> Program detail sekarang list panjang di-scroll. Bakal diubah: week tabs sticky (W1..Wn), tiap tab tampil 7 hari vertikal dengan tanggal + countdown, ada Duplicate session ke minggu lain (buat progression cepat), header dengan race countdown + fase context.
          </li>
          <li className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
            <strong>Edit aktivitas.</strong> Bisa hapus, belum bisa edit dari UI. (Draft baru bisa direview & edit sebelum simpan; aktivitas tersimpan cuma bisa dihapus + log ulang.)
          </li>
          <li className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
            <strong>Tambah/edit race dari UI.</strong> 3 race sudah ada dari Notion. Kalau mau tambah race baru, sekarang belum ada tombolnya di /races.
          </li>
          <li className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
            <strong>Export plan (M3).</strong> Import JSON sudah bisa; export sesi ke JSON (biar bisa di-share ke Claude atau backup) belum.
          </li>
          <li className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
            <strong>Widget API + Scriptable (M3).</strong> Endpoint <code>/api/v1/today</code> dan <code>/api/v1/week</code> + token widget di Settings, lalu <code>widget/today.js</code> untuk iPhone home screen.
          </li>
          <li className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
            <strong>MCP server + OAuth (M4).</strong> <code>/api/mcp</code> dengan tools <code>get_logging_context</code> + <code>import_activity</code> supaya Claude bisa isi draft langsung dari chat (tanpa copy-paste JSON manual).
          </li>
          <li className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
            <strong>Onboarding untuk teman (M5).</strong> Signup flow + first-time setup (zona HR, timezone) + panduan connect Claude & pasang widget.
          </li>
          <li className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
            <strong>Export semua data + hapus akun (M5).</strong> Service <code>account.deleteAllUserData</code> sudah ada, UI-nya belum. Export ke JSON juga belum.
          </li>
          <li className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
            <strong>Cron pembersih draft (harian).</strong> Draft <em>pending</em> punya <code>expires_at = +14 hari</code>. Sudah difilter saat dibaca, tapi belum ada cron yang beneran hapus dari DB.
          </li>
          <li className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
            <strong>Deploy ke Vercel + domain.</strong> App masih cuma jalan di localhost:3000. Belum bisa dipakai dari HP tanpa laptop nyala.
          </li>
        </ul>
      </section>

      {/* Perintah developer */}
      <section aria-labelledby="perintah">
        <h2
          id="perintah"
          className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500"
        >
          Perintah developer
        </h2>
        <ul className="space-y-1.5">
          {commands.map((c) => (
            <li
              key={c.cmd}
              className="flex items-start justify-between gap-4 rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
            >
              <code className="shrink-0 font-mono text-xs text-zinc-900 dark:text-zinc-100">
                {c.cmd}
              </code>
              <span className="text-right text-xs text-zinc-600 dark:text-zinc-400">{c.desc}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Alur log aktivitas */}
      <section aria-labelledby="alur">
        <h2 id="alur" className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Alur log aktivitas (sudah jalan)
        </h2>
        <ol className="space-y-3">
          <li className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-sm">
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white dark:bg-white dark:text-zinc-900">
                1
              </span>
              Pilih jalur di <Link href="/log/new" className="underline"><code className="text-xs">/log/new</code></Link>: <em>Manual</em>, <em>Dari sesi rencana hari ini</em>, atau <em>Paste JSON</em>. Nanti (M4) draft dari Claude via MCP juga muncul di sini.
            </p>
          </li>
          <li className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-sm">
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white dark:bg-white dark:text-zinc-900">
                2
              </span>
              Layar review (<code className="text-xs">/log/review/[id]</code> untuk draft, <code className="text-xs">/log/review/new</code> untuk manual): form pre-filled, isi RPE + Feel, konfirmasi sesi plan yang cocok.
            </p>
          </li>
          <li className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-sm">
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white dark:bg-white dark:text-zinc-900">
                3
              </span>
              Simpan → <code className="text-xs">activities.log</code> jalan dalam 1 transaksi: activities + run_metrics + items + sets, tautkan sesi plan (status → done), isi <code className="text-xs">zone_snapshot</code> dari metrik yang berlaku.
            </p>
          </li>
          <li className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-sm">
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white dark:bg-white dark:text-zinc-900">
                4
              </span>
              Aktivitas muncul di Today + Aktivitas, sesi plan berubah jadi <em>done</em>, ringkasan mingguan auto-update. Bisa dibuka detail-nya untuk lihat pace/cadence/GCT/balance.
            </p>
          </li>
        </ol>
      </section>
    </div>
  );
}

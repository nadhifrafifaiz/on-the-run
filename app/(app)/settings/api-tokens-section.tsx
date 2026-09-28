"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createApiTokenAction, revokeApiTokenAction } from "@/app/actions";

type TokenRow = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
};

type Props = {
  tokens: TokenRow[];
  baseUrl: string;
};

function fmt(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function ApiTokensSection({ tokens, baseUrl }: Props) {
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [issued, setIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const router = useRouter();

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }

  const active = tokens.filter((t) => !t.revokedAt);
  const revoked = tokens.filter((t) => t.revokedAt);

  return (
    <div className="space-y-4">
      {issued ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
            Token baru — salin sekarang, tidak akan ditampilkan lagi.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto break-all rounded-md bg-white px-3 py-2 font-mono text-xs text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
              {issued}
            </code>
            <button
              type="button"
              onClick={() => copy(issued, "token")}
              className="shrink-0 rounded-md bg-emerald-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 dark:bg-emerald-200 dark:text-emerald-900 dark:hover:bg-emerald-100"
            >
              {copied === "token" ? "Tersalin ✓" : "Salin"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIssued(null)}
            className="mt-3 text-xs text-emerald-800 underline underline-offset-4 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100"
          >
            Aku sudah menyalin, tutup
          </button>
        </div>
      ) : null}

      <form
        action={(fd) =>
          start(async () => {
            setErr(null);
            const n = String(fd.get("name") ?? "").trim();
            if (!n) {
              setErr("Nama wajib diisi");
              return;
            }
            const res = await createApiTokenAction(n);
            if (res.ok) {
              setIssued(res.data.token);
              setName("");
              router.refresh();
            } else {
              setErr(res.error.message);
            }
          })
        }
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama token (mis. iPhone widget)"
          maxLength={60}
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Membuat…" : "Buat token"}
        </button>
      </form>
      {err ? <p className="text-xs text-red-600 dark:text-red-400">{err}</p> : null}

      {active.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Aktif</h3>
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {active.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.name}</p>
                  <p className="text-xs text-zinc-500">
                    <code className="font-mono">{t.tokenPrefix}…</code>
                    {" · "}dibuat {fmt(t.createdAt)}
                    {t.lastUsedAt ? ` · terpakai ${fmt(t.lastUsedAt)}` : " · belum dipakai"}
                  </p>
                </div>
                <form
                  action={(fd) =>
                    start(async () => {
                      const id = String(fd.get("id"));
                      const res = await revokeApiTokenAction(id);
                      if (!res.ok) setErr(res.error.message);
                      else router.refresh();
                    })
                  }
                >
                  <input type="hidden" name="id" value={t.id} />
                  <button
                    type="submit"
                    disabled={pending}
                    className="text-xs text-red-600 underline underline-offset-4 hover:text-red-800 disabled:opacity-50 dark:text-red-400"
                  >
                    Cabut
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">
          Belum ada token. Buat satu untuk mulai pakai widget.
        </p>
      )}

      {revoked.length > 0 ? (
        <details className="text-xs">
          <summary className="cursor-pointer text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
            {revoked.length} token dicabut
          </summary>
          <ul className="mt-2 space-y-1 pl-4 text-zinc-500">
            {revoked.map((t) => (
              <li key={t.id}>
                {t.name} <code className="font-mono">{t.tokenPrefix}…</code> · dicabut {fmt(t.revokedAt)}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <section className="mt-4 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Cara pakai di Scriptable (iOS)
        </h3>
        <ol className="list-decimal space-y-2 pl-5 text-zinc-700 dark:text-zinc-300">
          <li>
            Install{" "}
            <a
              href="https://scriptable.app"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              Scriptable
            </a>{" "}
            dari App Store.
          </li>
          <li>Buat token di atas — salin plaintext-nya.</li>
          <li>
            Buka Scriptable → tap <strong>+</strong> → tempel template di bawah → ganti <code>TOKEN</code> dengan token
            yang baru disalin → tap <strong>Play ▶︎</strong> untuk preview.
          </li>
          <li>
            Tap-hold home screen → tambah widget <strong>Scriptable</strong> → pilih skrip ini di setting widget.
          </li>
        </ol>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Endpoint dasar:</p>
            <button
              type="button"
              onClick={() => copy(baseUrl, "url")}
              className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {copied === "url" ? "Tersalin ✓" : "Salin URL"}
            </button>
          </div>
          <code className="block overflow-x-auto break-all rounded-md bg-white px-3 py-2 font-mono text-xs text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
            {baseUrl}
          </code>

          <p className="pt-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Endpoint tersedia (semua butuh <code>Authorization: Bearer &lt;token&gt;</code>):
          </p>
          <ul className="space-y-0.5 pl-4 font-mono text-xs text-zinc-700 dark:text-zinc-300">
            <li>GET /api/v1/today</li>
            <li>GET /api/v1/week</li>
            <li>GET /api/v1/next-race</li>
          </ul>

          <details className="pt-2">
            <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
              Contoh template Scriptable (klik untuk expand)
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-md bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-100">
{`// on-the-run widget
const BASE = "${baseUrl}";
const TOKEN = "otr_paste_your_token_here";

const req = new Request(BASE + "/api/v1/today");
req.headers = { Authorization: "Bearer " + TOKEN };
const { data } = await req.loadJSON();

const w = new ListWidget();
w.backgroundColor = new Color("#0a0a0a");

const title = w.addText(data.date);
title.textColor = Color.gray();
title.font = Font.mediumSystemFont(10);

const s = data.todaySessions[0];
if (s) {
  const t = w.addText(s.title || s.sport);
  t.textColor = Color.white();
  t.font = Font.boldSystemFont(16);
} else {
  const t = w.addText("Rest day");
  t.textColor = Color.white();
  t.font = Font.boldSystemFont(16);
}

const wk = data.week;
const line = w.addText(
  wk.sessionsDone + "/" + wk.sessionsPlanned + " sesi · " +
  wk.runDistanceKm.toFixed(1) + " km"
);
line.textColor = new Color("#a1a1aa");
line.font = Font.systemFont(11);

Script.setWidget(w);
Script.complete();`}
            </pre>
            <p className="mt-2 text-xs text-zinc-500">
              Template lengkap juga ada di <code>docs/scriptable-widget.js</code> di repo.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}

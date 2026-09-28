"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDraftFromJsonAction } from "@/app/actions";

const EXAMPLE = `{
  "schema": "activity",
  "version": 1,
  "date": "2026-09-26",
  "sport": "run",
  "title": "Easy morning 5K",
  "duration": "28:45",
  "distance_km": 5.2,
  "avg_hr": 141,
  "max_hr": 155,
  "run": {
    "avg_pace": "5:31",
    "cadence_spm": 178
  },
  "notes": ""
}`;

export function JsonPasteForm() {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label htmlFor="raw" className="text-xs text-zinc-500">
          JSON aktivitas
        </label>
        <button
          type="button"
          onClick={() => setRaw(EXAMPLE)}
          className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Isi contoh
        </button>
      </div>
      <textarea
        id="raw"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={8}
        spellCheck={false}
        placeholder='{"schema":"activity","version":1,...}'
        className="w-full rounded-md border border-zinc-300 bg-white p-3 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending || !raw.trim()}
          onClick={() =>
            start(async () => {
              setErr(null);
              const res = await createDraftFromJsonAction(raw);
              if (res.ok) router.push(`/log/review/${res.data.draftId}`);
              else setErr(res.error.message);
            })
          }
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Memproses…" : "Buat draft → review"}
        </button>
        {err ? <span className="text-xs text-red-600">{err}</span> : null}
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { duplicateWeekAction } from "@/app/actions";

export function DuplicateWeekButton({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg(null);
            setErr(null);
            const res = await duplicateWeekAction(from, to);
            if (res.ok) {
              setMsg(res.message ?? "Selesai");
              router.push(`/week/${to}`);
            } else {
              setErr(res.error.message);
            }
          })
        }
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Menyalin…" : "Duplikasi ke minggu berikutnya"}
      </button>
      {msg ? <span className="text-xs text-green-600">{msg}</span> : null}
      {err ? <span className="text-xs text-red-600">{err}</span> : null}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { activateProgramAction, archiveProgramAction } from "@/app/actions";

type Props = {
  program: { id: string; type: "main" | "supporting"; status: string };
  otherActiveMainName: string | null;
};

export function ProgramActions({ program, otherActiveMainName }: Props) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const isActive = program.status === "active";
  const isArchived = program.status === "archived";
  const blockActivate = program.type === "main" && otherActiveMainName && !isActive;

  return (
    <div className="space-y-3">
      {blockActivate ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Program main aktif saat ini: <strong>{otherActiveMainName}</strong>. Arsipkan dulu program itu
          sebelum mengaktifkan yang ini.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!isActive && !isArchived ? (
          <button
            type="button"
            disabled={pending || Boolean(blockActivate)}
            onClick={() =>
              start(async () => {
                setMsg(null);
                setErr(null);
                const res = await activateProgramAction(program.id);
                if (res.ok) setMsg(res.message ?? "Diaktifkan");
                else setErr(res.error.message);
              })
            }
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? "…" : "Aktifkan"}
          </button>
        ) : null}

        {!isArchived ? (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setMsg(null);
                setErr(null);
                const res = await archiveProgramAction(program.id);
                if (res.ok) setMsg(res.message ?? "Diarsipkan");
                else setErr(res.error.message);
              })
            }
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            {pending ? "…" : "Arsipkan"}
          </button>
        ) : null}
      </div>

      {msg ? <p className="text-xs text-green-600">{msg}</p> : null}
      {err ? <p className="text-xs text-red-600">{err}</p> : null}
    </div>
  );
}

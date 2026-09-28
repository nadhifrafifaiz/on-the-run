"use client";

import { useState, useTransition } from "react";

type Props = {
  onConfirm: () => Promise<void>;
  label?: string; // "Hapus" (default)
  confirmLabel?: string; // "Ya, hapus" (default)
  confirmingText?: string; // "Yakin?" (default)
  loadingText?: string; // "Menghapus…" (default)
  size?: "sm" | "md";
};

// Standard inline delete confirmation used across activity / session / draft / phase.
// Program uses its own multi-step version because it has additional options.
export function ConfirmDelete({
  onConfirm,
  label = "Hapus",
  confirmLabel = "Ya, hapus",
  confirmingText = "Yakin?",
  loadingText = "Menghapus…",
  size = "sm",
}: Props) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const trigger = size === "md" ? "px-3 py-1.5" : "";

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={`text-xs text-red-600 underline underline-offset-4 hover:text-red-700 ${trigger}`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-500">{confirmingText}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setErr(null);
            try {
              await onConfirm();
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Gagal");
            }
          })
        }
        className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
      >
        {pending ? loadingText : confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        Batal
      </button>
      {err ? <span className="text-xs text-red-600">{err}</span> : null}
    </div>
  );
}

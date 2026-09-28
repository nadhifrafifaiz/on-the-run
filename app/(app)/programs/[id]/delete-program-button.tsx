"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProgramAction } from "@/app/actions";

type Props = {
  id: string;
  total: number;
  locked: number;
};

type Step = "idle" | "choose" | "confirm-orphan" | "confirm-cascade";

export function DeleteProgramButton({ id, total, locked }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState<Step>("idle");
  const [err, setErr] = useState<string | null>(null);

  const canCascade = locked === 0;
  const unlockedCount = total - locked;

  const doDelete = (deleteSessions: boolean) =>
    start(async () => {
      setErr(null);
      const res = await deleteProgramAction(id, { deleteSessions });
      if (res.ok) router.push("/programs");
      else setErr(res.error.message);
    });

  if (step === "idle") {
    return (
      <button
        type="button"
        onClick={() => setStep(total === 0 ? "confirm-orphan" : "choose")}
        className="text-xs text-red-600 underline underline-offset-4 hover:text-red-700"
      >
        Hapus program
      </button>
    );
  }

  // Program has no sessions — single confirmation.
  if (step === "confirm-orphan" && total === 0) {
    return (
      <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900/40 dark:bg-red-950/30">
        <p className="text-red-900 dark:text-red-200">
          Yakin hapus program ini? Program ini tidak punya sesi tertaut.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => doDelete(false)}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {pending ? "…" : "Ya, hapus program"}
          </button>
          <button
            type="button"
            onClick={() => setStep("idle")}
            className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Batal
          </button>
          {err ? <span className="text-xs text-red-600">{err}</span> : null}
        </div>
      </div>
    );
  }

  // Program has sessions — pick strategy first.
  if (step === "choose") {
    return (
      <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900/40 dark:bg-red-950/30">
        <div className="space-y-1">
          <p className="font-medium text-red-900 dark:text-red-200">
            Program ini punya {total} sesi tertaut.
            {locked > 0 ? ` ${locked} di antaranya terkunci (sudah punya aktivitas).` : ""}
          </p>
          <p className="text-red-800/80 dark:text-red-300/80">
            Program akan <strong>tetap dihapus</strong> di kedua opsi. Bedanya nasib sesi:
          </p>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setStep("confirm-orphan")}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-left text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <div className="font-medium text-zinc-900 dark:text-zinc-100">
              A. Hapus program, biarkan {total} sesi jadi sesi lepas
            </div>
            <div className="mt-0.5 text-zinc-600 dark:text-zinc-400">
              Sesi tetap ada di kalender tanpa program. Aman untuk histori.
            </div>
          </button>

          <button
            type="button"
            disabled={!canCascade}
            onClick={() => setStep("confirm-cascade")}
            className="w-full rounded-md border border-red-300 bg-white px-3 py-2 text-left text-xs hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:bg-zinc-900 dark:hover:bg-red-950/30"
          >
            <div className="font-medium text-red-900 dark:text-red-200">
              B. Hapus program + {unlockedCount} sesi
            </div>
            <div className="mt-0.5 text-red-800/80 dark:text-red-300/80">
              {canCascade
                ? "Sesi yang tidak punya aktivitas ikut dihapus. Tidak bisa di-undo."
                : `Tidak bisa — ${locked} sesi terkunci (sudah punya aktivitas). Pilih A.`}
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setStep("idle")}
          className="text-xs text-zinc-600 underline underline-offset-4 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Batal, jangan hapus
        </button>
      </div>
    );
  }

  // Final confirm — clear which action + real "Ya, hapus" button
  const isCascade = step === "confirm-cascade";
  return (
    <div className="space-y-3 rounded-lg border border-red-300 bg-red-100 p-4 text-sm dark:border-red-800 dark:bg-red-950/50">
      <p className="font-medium text-red-900 dark:text-red-100">
        Konfirmasi akhir:
      </p>
      <p className="text-red-900 dark:text-red-200">
        {isCascade
          ? `Program + ${unlockedCount} sesi akan dihapus. Tidak bisa di-undo.`
          : total > 0
            ? `Program akan dihapus. ${total} sesi jadi sesi lepas (tetap di kalender).`
            : "Program akan dihapus."}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => doDelete(isCascade)}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? "Menghapus…" : "Ya, hapus"}
        </button>
        <button
          type="button"
          onClick={() => setStep(total > 0 ? "choose" : "idle")}
          className="text-xs text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          ← Kembali
        </button>
        {err ? <span className="text-xs text-red-600">{err}</span> : null}
      </div>
    </div>
  );
}

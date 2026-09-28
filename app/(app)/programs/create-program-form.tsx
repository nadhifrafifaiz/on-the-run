"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProgramAction } from "@/app/actions";

export function CreateProgramForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      action={(fd) =>
        start(async () => {
          setErr(null);
          const name = String(fd.get("name") ?? "").trim();
          const type = String(fd.get("type") ?? "main") as "main" | "supporting";
          const goal = String(fd.get("goal") ?? "").trim();
          if (!name) {
            setErr("Nama program tidak boleh kosong");
            return;
          }
          const res = await createProgramAction({
            name,
            type,
            goal: goal || undefined,
          });
          if (res.ok) router.push(`/programs/${res.data.id}`);
          else setErr(res.error.message);
        })
      }
      className="space-y-3"
    >
      <div>
        <label htmlFor="name" className="mb-1 block text-xs text-zinc-500">
          Nama
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={120}
          placeholder="FM 2027 Base"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="type" className="mb-1 block text-xs text-zinc-500">
            Tipe
          </label>
          <select
            id="type"
            name="type"
            defaultValue="main"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="main">Main</option>
            <option value="supporting">Pendukung</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="goal" className="mb-1 block text-xs text-zinc-500">
          Goal (opsional)
        </label>
        <input
          id="goal"
          name="goal"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Membuat…" : "Buat program"}
        </button>
        {err ? <span className="text-xs text-red-600">{err}</span> : null}
      </div>
    </form>
  );
}

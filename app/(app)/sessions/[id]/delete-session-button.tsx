"use client";

import { useRouter } from "next/navigation";
import { deleteSessionAction } from "@/app/actions";
import { ConfirmDelete } from "@/app/_components/confirm-delete";

export function DeleteSessionButton({ id, locked }: { id: string; locked: boolean }) {
  const router = useRouter();
  if (locked) {
    return (
      <p className="text-xs text-zinc-500">
        Sesi ini terkunci karena sudah tertaut ke aktivitas. Hapus aktivitasnya dulu jika perlu.
      </p>
    );
  }
  return (
    <ConfirmDelete
      label="Hapus sesi"
      confirmingText="Yakin hapus sesi?"
      onConfirm={async () => {
        const res = await deleteSessionAction(id);
        if (res.ok) router.push("/today");
        else throw new Error(res.error.message);
      }}
    />
  );
}

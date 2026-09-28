"use client";

import { useRouter } from "next/navigation";
import { deleteActivityAction } from "@/app/actions";
import { ConfirmDelete } from "@/app/_components/confirm-delete";

export function DeleteActivityButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ConfirmDelete
      label="Hapus aktivitas"
      confirmingText="Yakin hapus aktivitas?"
      onConfirm={async () => {
        const res = await deleteActivityAction(id);
        if (res.ok) router.push("/activities");
        else throw new Error(res.error.message);
      }}
    />
  );
}

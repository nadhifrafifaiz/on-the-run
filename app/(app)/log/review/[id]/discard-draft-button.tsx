"use client";

import { useRouter } from "next/navigation";
import { discardDraftAction } from "@/app/actions";
import { ConfirmDelete } from "@/app/_components/confirm-delete";

export function DiscardDraftButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ConfirmDelete
      label="Buang draft"
      confirmingText="Yakin buang draft?"
      confirmLabel="Ya, buang"
      loadingText="Membuang…"
      onConfirm={async () => {
        const res = await discardDraftAction(id);
        if (res.ok) router.push("/log/new");
        else throw new Error(res.error.message);
      }}
    />
  );
}

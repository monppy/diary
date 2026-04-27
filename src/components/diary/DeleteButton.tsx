"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteEntryAction } from "@/actions/entries";

export function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm("この日記を削除しますか？この操作は取り消せません。")) return;
    startTransition(async () => {
      const result = await deleteEntryAction(id);
      if (result.success) {
        router.push("/entries");
      } else {
        alert(result.error);
      }
    });
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
    >
      {isPending ? "削除中…" : "削除"}
    </Button>
  );
}

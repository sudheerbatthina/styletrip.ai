"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteBoardButton({ boardId }: { boardId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function deleteBoard() {
    const confirmed = window.confirm("Delete this saved board? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    setLoading(true);
    const response = await fetch(`/api/boards/${boardId}`, {
      method: "DELETE",
    });
    setLoading(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      alert(data.error ?? "Could not delete board.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Button variant="destructive" onClick={() => void deleteBoard()} disabled={loading}>
      <Trash2 className="h-4 w-4" />
      {loading ? "Deleting" : "Delete Board"}
    </Button>
  );
}

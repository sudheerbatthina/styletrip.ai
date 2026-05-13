"use client";

import { useRouter } from "next/navigation";
import { BoardBuilder } from "@/components/board/BoardBuilder";
import type {
  ImageInput,
  Preferences,
  StyleAnalysis,
  StyleCardData,
} from "@/lib/schemas";

export function NewBoardClient({ persistEnabled }: { persistEnabled: boolean }) {
  const router = useRouter();

  async function saveBoard(payload: {
    image: ImageInput;
    boardImage: string;
    analysis: StyleAnalysis;
    selectedStyles: StyleCardData[];
    preferences: Preferences;
  }) {
    const response = await fetch("/api/boards/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { boardId?: string; error?: string };

    if (!response.ok || !data.boardId) {
      throw new Error(data.error ?? "Could not save board.");
    }

    router.push(`/boards/${data.boardId}`);
    router.refresh();
  }

  return (
    <BoardBuilder
      persistEnabled={persistEnabled}
      onSaveBoard={persistEnabled ? saveBoard : undefined}
    />
  );
}

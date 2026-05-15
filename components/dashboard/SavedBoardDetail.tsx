"use client";

import { useRef } from "react";
import { toPng } from "html-to-image";
import { Download, ShoppingBag } from "lucide-react";
import { DeleteBoardButton } from "@/components/dashboard/DeleteBoardButton";
import { FashionBoardRenderer } from "@/components/result/FashionBoardRenderer";
import { Button } from "@/components/ui/button";
import type {
  OutfitImage,
  Preferences,
  StyleAnalysis,
  SelectableStyle,
} from "@/lib/schemas";

export function SavedBoardDetail({
  boardId,
  analysis,
  preferences,
  selectedStyles,
  outfitImages,
}: {
  boardId: string;
  analysis: StyleAnalysis;
  preferences: Preferences;
  selectedStyles: SelectableStyle[];
  outfitImages: OutfitImage[];
}) {
  const boardRef = useRef<HTMLDivElement>(null);

  async function downloadBoard() {
    if (!boardRef.current) {
      return;
    }
    const image = await toPng(boardRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#f8f3ea",
    });
    const link = document.createElement("a");
    link.href = image;
    link.download = "styletrip-ai-saved-board.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="overflow-hidden rounded-lg border bg-muted p-3">
        <FashionBoardRenderer
          ref={boardRef}
          analysis={analysis}
          preferences={preferences}
          selectedStyles={selectedStyles}
          outfitImages={outfitImages}
        />
      </div>
      <div className="space-y-2">
        <Button className="w-full" onClick={() => void downloadBoard()}>
          <Download className="h-4 w-4" />
          Download PNG
        </Button>
        <Button className="w-full" variant="secondary" disabled title="Coming soon">
          <ShoppingBag className="h-4 w-4" />
          Generate shopping links
        </Button>
        <DeleteBoardButton boardId={boardId} />
        <p className="pt-2 text-xs leading-5 text-muted-foreground">
          TODO: later support regenerating one saved look, replacing that outfit
          image, and leaving the remaining board unchanged.
        </p>
      </div>
    </div>
  );
}


"use client";

import { useRef } from "react";
import { toPng } from "html-to-image";
import {
  Download,
  RefreshCw,
  Save,
  ShoppingBag,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FashionBoardRenderer } from "@/components/result/FashionBoardRenderer";
import type {
  OutfitImage,
  Preferences,
  StyleAnalysis,
  SelectableStyle,
} from "@/lib/schemas";

const refinements = [
  "more streetwear",
  "less formal",
  "more colorful",
  "more luxury",
  "more casual",
  "more Vegas night",
  "more summer",
  "more budget friendly",
];

export function GeneratedBoard({
  analysis,
  preferences,
  selectedStyles,
  outfitImages,
  loading,
  onRegenerate,
  onEditPreferences,
  onSaveBoard,
  onDownloadBoard,
  persistEnabled = false,
  saving = false,
}: {
  analysis: StyleAnalysis;
  preferences: Preferences;
  selectedStyles: SelectableStyle[];
  outfitImages: OutfitImage[];
  loading?: boolean;
  onRegenerate: (instruction?: string) => void;
  onEditPreferences: () => void;
  onSaveBoard?: (boardImage: string) => void;
  onDownloadBoard?: () => void;
  persistEnabled?: boolean;
  saving?: boolean;
}) {
  const boardRef = useRef<HTMLDivElement>(null);

  async function exportBoard() {
    if (!boardRef.current) {
      throw new Error("Board is not ready to export.");
    }

    return toPng(boardRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#f8f3ea",
    });
  }

  async function downloadImage() {
    const boardImage = await exportBoard();
    const link = document.createElement("a");
    link.href = boardImage;
    link.download = "styletrip-ai-outfit-board.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    onDownloadBoard?.();
  }

  async function saveBoard() {
    const boardImage = await exportBoard();
    onSaveBoard?.(boardImage);
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-lg border bg-muted p-3">
            <FashionBoardRenderer
              ref={boardRef}
              analysis={analysis}
              preferences={preferences}
              selectedStyles={selectedStyles}
              outfitImages={outfitImages}
            />
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold">Personalized look inspiration</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The board is rendered with frontend typography and layout, using AI
                outfit images as visual panels. It is not an exact try-on.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {persistEnabled ? (
                <Button onClick={() => void saveBoard()} disabled={loading || saving}>
                  <Save className="h-4 w-4" />
                  {saving ? "Saving" : "Save Board"}
                </Button>
              ) : null}
              <Button onClick={() => void downloadImage()} disabled={loading}>
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button
                variant="outline"
                onClick={() => onRegenerate()}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
              <Button variant="outline" onClick={onEditPreferences}>
                <SlidersHorizontal className="h-4 w-4" />
                Edit Preferences
              </Button>
              <Button variant="secondary" disabled title="Coming soon">
                <ShoppingBag className="h-4 w-4" />
                Shopping Links
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Refine demo board with</p>
              <div className="flex flex-wrap gap-2">
                {refinements.map((instruction) => (
                  <Button
                    key={instruction}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={loading}
                    onClick={() => onRegenerate(instruction)}
                  >
                    {instruction}
                  </Button>
                ))}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                TODO: later support regenerating one selected look, replacing only
                that look image, and keeping the rest of the board unchanged.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/35 p-4">
              <p className="text-sm font-semibold">Future modules</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Shopping agent, closet upload, liked/disliked feedback, trip packing
                list, and separate boards for day, night, pool, airport, dinner,
                club, and photoshoot.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


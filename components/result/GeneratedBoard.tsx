"use client";

import Image from "next/image";
import {
  Download,
  RefreshCw,
  Save,
  ShoppingBag,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
  image,
  loading,
  onRegenerate,
  onEditPreferences,
  onSaveBoard,
  persistEnabled = false,
  saving = false,
  aspectRatio = "1:1",
}: {
  image: string;
  loading?: boolean;
  onRegenerate: (instruction?: string) => void;
  onEditPreferences: () => void;
  onSaveBoard?: () => void;
  persistEnabled?: boolean;
  saving?: boolean;
  aspectRatio?: "1:1" | "4:5" | "16:9";
}) {
  function downloadImage() {
    const link = document.createElement("a");
    link.href = image;
    link.download = "styletrip-ai-outfit-board.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div
            className={
              aspectRatio === "16:9"
                ? "relative aspect-video overflow-hidden rounded-lg border bg-muted"
                : aspectRatio === "4:5"
                  ? "relative aspect-[4/5] overflow-hidden rounded-lg border bg-muted"
                  : "relative aspect-square overflow-hidden rounded-lg border bg-muted"
            }
          >
            <Image
              src={image}
              alt="Generated AI outfit inspiration board"
              fill
              className="object-contain"
              unoptimized
            />
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold">AI outfit inspiration</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                This is a fashion collage for inspiration, not an exact try-on or
                identity match.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {persistEnabled ? (
                <Button onClick={onSaveBoard} disabled={loading || saving}>
                  <Save className="h-4 w-4" />
                  {saving ? "Saving" : "Save Board"}
                </Button>
              ) : null}
              <Button onClick={downloadImage} disabled={loading}>
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
              <Button
                variant="secondary"
                disabled
                title="Coming soon"
              >
                <ShoppingBag className="h-4 w-4" />
                Shopping Links
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Regenerate with</p>
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

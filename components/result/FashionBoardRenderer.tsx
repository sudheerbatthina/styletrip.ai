"use client";

/* eslint-disable @next/next/no-img-element */

import { forwardRef } from "react";
import { Badge } from "@/components/ui/badge";
import type {
  AspectRatio,
  OutfitImage,
  Preferences,
  ReferenceLook,
  SelectableStyle,
  StyleAnalysis,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";

export const FashionBoardRenderer = forwardRef<
  HTMLDivElement,
  {
    analysis: StyleAnalysis;
    preferences: Preferences;
    selectedStyles: SelectableStyle[];
    outfitImages: OutfitImage[];
  }
>(function FashionBoardRenderer(
  { analysis, preferences, selectedStyles, outfitImages },
  ref,
) {
  const aspectRatio = preferences.aspectRatio;
  const count = selectedStyles.length;
  const imageByStyle = new Map(
    outfitImages.map((outfitImage) => [outfitImage.styleId, outfitImage.image]),
  );
  const palette = Array.from(
    new Set([
      ...analysis.recommendedColorPalette.slice(0, 8),
      ...selectedStyles.flatMap(getColors).slice(0, 8),
    ]),
  ).slice(0, 10);
  const occasions = Array.from(new Set(selectedStyles.map(getOccasion))).slice(0, 8);
  const fits = Array.from(new Set(selectedStyles.map(getFit))).slice(0, 8);

  return (
    <div
      ref={ref}
      className={cn(
        "mx-auto w-full max-w-full overflow-hidden bg-[#f8f3ea] text-[#162733] shadow-sm",
        getBoardRatioClass(aspectRatio),
      )}
      style={{ maxWidth: getBoardMaxWidth(aspectRatio) }}
    >
      <div className={cn("flex h-full min-h-0 flex-col", getBoardPaddingClass(count))}>
        <header
          className={cn(
            "flex shrink-0 items-start justify-between gap-4 border-b border-[#c9bbab]",
            count > 8 ? "mb-2 pb-2" : "mb-4 pb-3",
          )}
        >
          <div className="min-w-0">
            <p className={cn("font-bold text-[#0f5366]", count > 8 ? "text-sm" : "text-base")}>
              StyleTrip AI
            </p>
            <h1
              className={cn(
                "mt-1 truncate font-bold tracking-normal",
                count > 8 ? "text-xl" : "text-2xl sm:text-3xl",
              )}
            >
              {preferences.tripLocation} {preferences.tripType} lookbook
            </h1>
          </div>
          <div className={cn("shrink-0 text-right leading-5 text-[#52616b]", count > 8 ? "text-xs" : "text-sm")}>
            <p>{count} visual looks</p>
            <p>{aspectRatio} board</p>
            <p>{formatResemblance(preferences.resemblanceMode)}</p>
          </div>
        </header>

        <section
          className={cn(
            "grid min-h-0 flex-1 auto-rows-fr gap-2",
            getGridClass(count),
          )}
        >
          {selectedStyles.map((style, index) => {
            const matchScore = getMatchScore(style);
            const image = imageByStyle.get(style.id);

            return (
              <article
                key={style.id}
                className="min-h-0 overflow-hidden rounded-md border border-[#c9bbab] bg-[#fffaf2]"
              >
                <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
                  <div className="relative min-h-0 bg-[#f1e8da]">
                    {image ? (
                      <img
                        src={image}
                        alt=""
                        className="h-full w-full object-contain p-1.5"
                      />
                    ) : null}
                    <div className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded bg-[#123d52] text-sm font-bold text-white">
                      {index + 1}
                    </div>
                  </div>
                  <div className={cn("space-y-1", count > 8 ? "p-2" : "p-3")}>
                    <div className="flex items-start justify-between gap-1.5">
                      <h2 className={cn("line-clamp-2 font-bold leading-tight", count > 8 ? "text-xs" : "text-sm")}>
                        {style.title}
                      </h2>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {matchScore ? (
                          <span className="rounded bg-[#123d52] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {matchScore}% match
                          </span>
                        ) : null}
                        <span className="rounded bg-[#eadfce] px-1.5 py-0.5 text-[10px] font-semibold">
                          {getFit(style)}
                        </span>
                      </div>
                    </div>
                    <p className="truncate text-[10px] font-semibold uppercase tracking-normal text-[#0f5366]">
                      {getOccasion(style)}
                    </p>
                    <p className={cn("text-[#52616b]", count > 8 ? "line-clamp-1 text-[10px]" : "line-clamp-2 text-xs")}>
                      {getItems(style).slice(0, 3).join(" / ")}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {getColors(style).slice(0, count > 8 ? 2 : 3).map((color) => (
                        <span
                          key={color}
                          className="rounded bg-[#eadfce] px-1.5 py-0.5 text-[10px] font-semibold"
                        >
                          {color}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <footer
          className={cn(
            "grid shrink-0 gap-2 border-t border-[#c9bbab] leading-5 sm:grid-cols-3",
            count > 8 ? "mt-2 pt-2 text-xs" : "mt-4 pt-3 text-sm",
          )}
        >
          <FooterGroup title="Best colors" items={palette} compact={count > 8} />
          <FooterGroup title="Occasions" items={occasions} compact={count > 8} />
          <FooterGroup title="Fits" items={fits} compact={count > 8} />
        </footer>
      </div>
    </div>
  );
});

function isReferenceLook(style: SelectableStyle): style is ReferenceLook {
  return "referenceImageUrl" in style;
}

function getMatchScore(style: SelectableStyle) {
  if (!isReferenceLook(style) || style.overallMatchScore <= 0) {
    return null;
  }
  return Math.round(style.overallMatchScore);
}

function getOccasion(style: SelectableStyle) {
  return isReferenceLook(style) ? style.occasion : style.bestFor;
}

function getFit(style: SelectableStyle) {
  return isReferenceLook(style) ? style.fit : style.vibe;
}

function getItems(style: SelectableStyle) {
  return style.items;
}

function getColors(style: SelectableStyle) {
  if (isReferenceLook(style)) {
    return style.colorMood.split("/").map((color) => color.trim()).filter(Boolean);
  }
  return style.colors;
}

function FooterGroup({
  title,
  items,
  compact,
}: {
  title: string;
  items: string[];
  compact?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1 font-bold">{title}</p>
      <div className="flex flex-wrap gap-1">
        {items.slice(0, compact ? 4 : 6).map((item) => (
          <Badge key={item} className="bg-[#eadfce] text-[#162733]">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function getBoardRatioClass(aspectRatio: AspectRatio) {
  if (aspectRatio === "4:5") {
    return "aspect-[4/5]";
  }
  if (aspectRatio === "16:9") {
    return "aspect-video";
  }
  return "aspect-square";
}

function getBoardMaxWidth(aspectRatio: AspectRatio) {
  if (aspectRatio === "16:9") {
    return 1280;
  }
  if (aspectRatio === "4:5") {
    return 760;
  }
  return 960;
}

function getBoardPaddingClass(count: number) {
  if (count > 8) {
    return "p-3 sm:p-4";
  }
  return "p-4 sm:p-6";
}

function getGridClass(count: number) {
  if (count <= 4) {
    return "grid-cols-2";
  }
  if (count <= 8) {
    return "grid-cols-2 sm:grid-cols-4";
  }
  if (count <= 12) {
    return "grid-cols-3 sm:grid-cols-4";
  }
  return "grid-cols-4";
}

function formatResemblance(value: Preferences["resemblanceMode"]) {
  if (value === "balanced") {
    return "Balanced inspiration";
  }
  if (value === "loose") {
    return "Loose reference";
  }
  return "Strong resemblance";
}
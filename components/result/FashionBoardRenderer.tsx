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
        "overflow-hidden bg-[#f8f3ea] text-[#162733]",
        getBoardRatioClass(aspectRatio),
      )}
      style={{
        width: aspectRatio === "16:9" ? 1600 : aspectRatio === "4:5" ? 1280 : 1400,
      }}
    >
      <div className="flex h-full flex-col p-10">
        <header className="mb-6 flex items-start justify-between gap-8 border-b border-[#c9bbab] pb-5">
          <div>
            <p className="text-2xl font-bold text-[#0f5366]">StyleTrip AI</p>
            <h1 className="mt-2 text-5xl font-bold tracking-normal">
              {preferences.tripLocation} {preferences.tripType} lookbook
            </h1>
          </div>
          <div className="text-right text-xl leading-8 text-[#52616b]">
            <p>{selectedStyles.length} visual looks</p>
            <p>{aspectRatio} board</p>
            <p>{formatResemblance(preferences.resemblanceMode)}</p>
          </div>
        </header>

        <section
          className={cn(
            "grid flex-1 gap-4",
            getGridClass(aspectRatio, selectedStyles.length),
          )}
        >
          {selectedStyles.map((style, index) => (
            <article
              key={style.id}
              className="min-h-0 overflow-hidden rounded-lg border border-[#c9bbab] bg-white"
            >
              <div className="grid h-full grid-rows-[minmax(0,1fr)_auto]">
                <div className="relative min-h-0 bg-[#eee6da]">
                  {imageByStyle.get(style.id) ? (
                    <img
                      src={imageByStyle.get(style.id)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  <div className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-md bg-[#123d52] text-xl font-bold text-white">
                    {index + 1}
                  </div>
                </div>
                <div className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-bold leading-tight">{style.title}</h2>
                    <span className="rounded bg-[#eadfce] px-2 py-1 text-xs font-semibold">
                      {getFit(style)}
                    </span>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-normal text-[#0f5366]">
                    {getOccasion(style)}
                  </p>
                  <p className="text-sm leading-5 text-[#52616b]">
                    {getItems(style).slice(0, 4).join(" · ")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {getColors(style).slice(0, 3).map((color) => (
                      <span
                        key={color}
                        className="rounded bg-[#eadfce] px-2 py-1 text-xs font-semibold"
                      >
                        {color}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>

        <footer className="mt-6 grid gap-4 border-t border-[#c9bbab] pt-5 text-lg leading-7 lg:grid-cols-3">
          <FooterGroup title="Best colors" items={palette} />
          <FooterGroup title="Occasions" items={occasions} />
          <FooterGroup title="Fits" items={fits} />
        </footer>
      </div>
    </div>
  );
});

function isReferenceLook(style: SelectableStyle): style is ReferenceLook {
  return "referenceImageUrl" in style;
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

function FooterGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-2 font-bold">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
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

function getGridClass(aspectRatio: AspectRatio, count: number) {
  if (aspectRatio === "16:9") {
    return count <= 8 ? "grid-cols-4" : "grid-cols-6";
  }
  if (aspectRatio === "4:5") {
    return count <= 8 ? "grid-cols-2" : "grid-cols-4";
  }
  return count <= 4 ? "grid-cols-2" : count <= 8 ? "grid-cols-4" : "grid-cols-4";
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



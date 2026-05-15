import { mockStyleCards } from "@/lib/mock-data";
import { getCuratedReferenceImage } from "@/lib/reference/curated-reference-library";
import type { Preferences, ReferenceLook, StyleAnalysis, StyleCardData } from "@/lib/schemas";

const defaultOccasions = ["airport", "daytime walking", "dinner", "casual night"];

export type ReferenceProviderInput = {
  analysis: StyleAnalysis;
  preferences: Preferences;
  target: number;
};

export function getOccasion(style: StyleCardData, preferences: Preferences, index: number) {
  const options = preferences.occasionTypes.length > 0
    ? preferences.occasionTypes
    : defaultOccasions;
  const lower = style.bestFor.toLowerCase();
  return options.find((occasion) => lower.includes(occasion.toLowerCase())) ?? options[index % options.length];
}

export function getColorMood(style: StyleCardData) {
  return style.colors.slice(0, 3).join(" / ");
}

export function createBaseReferenceLook({
  style,
  index,
  preferences,
  imageUrl,
  source,
  sourceUrl = null,
  sourceName = "",
  photographer = "",
  photographerUrl = null,
  attributionText = "",
}: {
  style: StyleCardData;
  index: number;
  preferences: Preferences;
  imageUrl: string;
  source: ReferenceLook["source"];
  sourceUrl?: string | null;
  sourceName?: string;
  photographer?: string;
  photographerUrl?: string | null;
  attributionText?: string;
}): ReferenceLook {
  return {
    id: `look-${index + 1}`,
    title: style.title,
    occasion: getOccasion(style, preferences, index),
    fit: preferences.preferredFit,
    colorMood: getColorMood(style),
    items: style.items.slice(0, 4),
    whyItFits: style.whyItFitsUser,
    referenceImageUrl: imageUrl,
    source,
    sourceUrl,
    sourceName,
    photographer,
    photographerUrl,
    attributionText,
    promptHint: style.imagePromptHint,
    selected: false,
    overallMatchScore: 0,
    bodyFitScore: 0,
    colorScore: 0,
    occasionScore: 0,
    preferenceScore: 0,
    whyThisMatches: [],
    matchTags: [],
  };
}

export async function getCuratedReferenceLooks({
  preferences,
  target,
}: ReferenceProviderInput): Promise<ReferenceLook[]> {
  return mockStyleCards.slice(0, target).map((style, index) =>
    createBaseReferenceLook({
      style,
      index,
      preferences,
      imageUrl: getCuratedReferenceImage(style, index, preferences.preferredFit),
      source: "curated",
      sourceName: "StyleTrip curated demo",
      attributionText: "Local curated demo asset",
    }),
  );
}

export { mockStyleCards };
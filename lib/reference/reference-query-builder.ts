import type { Preferences, StyleAnalysis, StyleCardData } from "@/lib/schemas";

export type ReferenceQueryInput = {
  analysis: StyleAnalysis;
  preferences: Preferences;
  style: StyleCardData;
  occasion: string;
};

export function buildReferenceQuery({
  analysis,
  preferences,
  style,
  occasion,
}: ReferenceQueryInput) {
  const genderDirection = normalizeWords(preferences.genderStyleDirection || "men style");
  const location = normalizeWords(preferences.tripLocation);
  const fit = normalizeWords(preferences.preferredFit);
  const palette = [
    ...splitWords(preferences.favoriteColors),
    ...analysis.recommendedColorPalette,
    ...style.colors,
  ].slice(0, 4);
  const items = style.items.slice(0, 3).join(" ");
  const occasionText = normalizeWords(occasion);

  return Array.from(
    new Set([
      genderDirection,
      location,
      occasionText,
      "outfit",
      fit,
      ...palette.map(normalizeWords),
      items,
    ].filter(Boolean)),
  ).join(" ");
}

export function buildReferenceQueries(input: ReferenceQueryInput) {
  const base = buildReferenceQuery(input);
  const { preferences, style, occasion } = input;
  const genderDirection = normalizeWords(preferences.genderStyleDirection || "men style");

  return Array.from(
    new Set([
      base,
      `${genderDirection} ${normalizeWords(preferences.tripLocation)} ${normalizeWords(occasion)} outfit ${normalizeWords(preferences.preferredFit)} pants`,
      `${genderDirection} vacation outfit ${style.items.slice(0, 2).join(" ")}`,
      `${genderDirection} streetwear ${style.colors.slice(0, 2).join(" ")} casual outfit`,
    ]),
  );
}

function splitWords(value: string) {
  return value
    .split(/[,.]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeWords(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}
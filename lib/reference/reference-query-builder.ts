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
  const genderDirection = getSimpleStyleDirection(preferences.genderStyleDirection);
  const location = getLocationCue(preferences.tripLocation);
  const fit = normalizeWords(preferences.preferredFit || "relaxed");
  const palette = [
    ...splitWords(preferences.favoriteColors),
    ...analysis.recommendedColorPalette,
    ...style.colors,
  ].map(normalizeWords).filter(Boolean).slice(0, 3);
  const items = getPracticalItems(style.items, preferences.dislikedStyles);
  const occasionText = normalizeWords(occasion);

  return Array.from(
    new Set([
      genderDirection,
      location,
      occasionText,
      "outfit",
      fit,
      ...palette,
      items,
      getFootwearCue(style),
    ].filter(Boolean)),
  ).join(" ");
}

export function buildReferenceQueries(input: ReferenceQueryInput) {
  const base = buildReferenceQuery(input);
  const { preferences, style, occasion } = input;
  const genderDirection = getSimpleStyleDirection(preferences.genderStyleDirection);
  const colors = [
    ...splitWords(preferences.favoriteColors),
    ...input.analysis.recommendedColorPalette,
    ...style.colors,
  ].map(normalizeWords).filter(Boolean).slice(0, 3).join(" ");
  const items = getPracticalItems(style.items, preferences.dislikedStyles);
  const location = getLocationCue(preferences.tripLocation);
  const fit = normalizeWords(preferences.preferredFit || "relaxed");
  const occasionText = normalizeWords(occasion);

  return Array.from(
    new Set([
      base,
      `${genderDirection} ${occasionText} outfit ${fit} pants`,
      `${genderDirection} ${location} vacation outfit ${colors}`,
      `${genderDirection} summer travel outfit neutral colors`,
      `${genderDirection} casual outfit ${items} ${getFootwearCue(style)}`,
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

function getSimpleStyleDirection(value: string) {
  const normalized = normalizeWords(value || "men style");
  if (normalized.includes("women")) {
    return "women";
  }
  if (normalized.includes("unisex")) {
    return "unisex";
  }
  if (normalized.includes("men")) {
    return "men";
  }
  return normalized.split(" ").slice(0, 2).join(" ") || "men";
}

function getLocationCue(value: string) {
  const normalized = normalizeWords(value);
  if (!normalized) {
    return "travel";
  }
  if (normalized.includes("las vegas") || normalized.includes("vegas")) {
    return "vegas";
  }
  if (normalized.includes("beach") || normalized.includes("resort")) {
    return "resort";
  }
  return normalized.split(" ").slice(0, 2).join(" ");
}

function getPracticalItems(items: string[], dislikedStyles?: string) {
  const disliked = splitWords(dislikedStyles ?? "").map(normalizeWords);
  return items
    .map(normalizeWords)
    .filter((item) => !disliked.some((dislike) => item.includes(dislike)))
    .flatMap((item) => item.split(" ").slice(-3))
    .filter((item) => item.length > 2)
    .slice(0, 5)
    .join(" ");
}

function getFootwearCue(style: StyleCardData) {
  const text = [...style.footwear, ...style.items].join(" ").toLowerCase();
  if (text.includes("sneaker")) {
    return "sneakers";
  }
  if (text.includes("sandal") || text.includes("slides")) {
    return "sandals";
  }
  if (text.includes("loafer")) {
    return "loafers";
  }
  return "shoes";
}

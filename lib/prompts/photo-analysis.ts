import type { Preferences } from "@/lib/schemas";

export function buildPhotoAnalysisPrompt(preferences: Preferences) {
  return [
    "Analyze the uploaded photo only for visible fashion-relevant styling traits.",
    "Return structured JSON with frameNotes, proportions, currentOutfit, colorStyling, fitAdvice, avoid, recommendedPalette, recommendedSilhouettes, styleDirections, and uncertaintyNotes.",
    "Do not identify the person. Do not infer sensitive traits. Do not make medical or body-judgment claims.",
    "Use practical styling language and mention uncertainty when the photo is unclear.",
    `User context: ${preferences.occasionUseCase || preferences.tripType || "general styling"}`,
    `Style direction: ${preferences.styleVibe || preferences.genderStyleDirection || "open"}`,
    `Favorite colors: ${preferences.favoriteColors || "not specified"}`,
    `Colors to avoid: ${preferences.colorsToAvoid || "not specified"}`,
  ].join("\n");
}

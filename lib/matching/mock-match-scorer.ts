import type { MatchScoringInput } from "@/lib/matching/match-scorer";
import { sortLooksByMatch } from "@/lib/matching/match-scorer";
import { applyStyleMemoryToReferenceLooks } from "@/lib/feedback/feedback-memory";
import type { ReferenceLook } from "@/lib/schemas";

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function splitList(value?: string) {
  return (value ?? "")
    .split(/[,.]/)
    .map((item) => normalize(item))
    .filter(Boolean);
}

function scoreContains(haystack: string, needles: string[], base: number, bonus: number) {
  if (needles.length === 0) {
    return base;
  }
  const matches = needles.filter((needle) => haystack.includes(needle)).length;
  return clamp(base + matches * bonus);
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getCurrentStyleCompatibility(look: ReferenceLook, analysisText: string) {
  const lookText = normalize(`${look.title} ${look.items.join(" ")} ${look.promptHint}`);
  return scoreContains(lookText, analysisText.split(/\W+/).filter((word) => word.length > 4), 55, 2);
}

export function scoreMockReferenceLooks({
  looks,
  analysis,
  preferences,
}: MatchScoringInput) {
  const selectedOccasions = preferences.occasionTypes.map(normalize);
  const favoriteColors = splitList(preferences.favoriteColors);
  const dislikedStyles = splitList(preferences.dislikedStyles);
  const palette = analysis.recommendedColorPalette.map(normalize);
  const silhouettes = analysis.recommendedSilhouettes.map(normalize);
  const feedback = preferences.referenceFeedback;
  const analysisText = normalize(
    `${analysis.visibleStyleProfile.currentOutfitNotes} ${analysis.visibleStyleProfile.fitAdvice.join(" ")} ${analysis.recommendedSilhouettes.join(" ")}`,
  );

  const scored = looks.map((look): ReferenceLook => {
    const lookText = normalize(
      `${look.title} ${look.occasion} ${look.fit} ${look.colorMood} ${look.items.join(" ")} ${look.promptHint}`,
    );

    const occasionScore = scoreContains(
      normalize(`${look.occasion} ${look.title} ${look.promptHint}`),
      selectedOccasions,
      selectedOccasions.length > 0 ? 62 : 72,
      22,
    );
    const bodyFitScore = clamp(
      (normalize(look.fit).includes(normalize(preferences.preferredFit)) ? 84 : 68) +
        (silhouettes.some((silhouette) => lookText.includes(silhouette.split(" ")[0])) ? 8 : 0),
    );
    const colorScore = clamp(
      scoreContains(lookText, palette, 58, 8) +
        scoreContains(lookText, favoriteColors, 0, 10),
    );
    const dislikePenalty = dislikedStyles.some((style) => lookText.includes(style)) ? 24 : 0;
    const selectedBoost = feedback?.selected.includes(look.id) ? 8 : 0;
    const deselectedPenalty = feedback?.deselected.includes(look.id) ? 6 : 0;
    const notMyStylePenalty = feedback?.notMyStyle.includes(look.id) ? 36 : 0;
    const preferenceScore = clamp(
      76 +
        (normalize(look.fit).includes(normalize(preferences.preferredFit)) ? 10 : 0) +
        (favoriteColors.some((color) => lookText.includes(color)) ? 8 : 0) -
        dislikePenalty +
        selectedBoost -
        deselectedPenalty -
        notMyStylePenalty,
    );
    const currentStyleCompatibility = getCurrentStyleCompatibility(look, analysisText);
    const overallMatchScore = clamp(
      occasionScore * 0.3 +
        bodyFitScore * 0.25 +
        colorScore * 0.2 +
        preferenceScore * 0.15 +
        currentStyleCompatibility * 0.1 +
        selectedBoost -
        deselectedPenalty -
        notMyStylePenalty,
    );

    const whyThisMatches = [
      `Good for ${look.occasion}, with a ${look.fit} fit and ${look.colorMood} palette.`,
      `${look.fit} fit supports your preferred fit direction.`,
      `${look.colorMood} connects to the recommended palette.`,
    ];

    if (dislikePenalty > 0) {
      whyThisMatches.push("Some details overlap with disliked styles, so this was downranked.");
    }
    if (notMyStylePenalty > 0) {
      whyThisMatches.push("You marked this direction as not your style, so similar looks are downranked.");
    }

    const matchTags = [
      `${look.occasion}`,
      `${look.fit} fit`,
      `${look.colorMood.split("/")[0]?.trim() ?? "palette"}`,
      notMyStylePenalty > 0 ? "downranked" : "",
      overallMatchScore >= 85 ? "high match" : "solid match",
    ].filter(Boolean);

    return {
      ...look,
      overallMatchScore,
      bodyFitScore,
      colorScore,
      occasionScore,
      preferenceScore,
      whyThisMatches,
      matchTags: Array.from(new Set(matchTags)).slice(0, 4),
    };
  });

  return sortLooksByMatch(
    applyStyleMemoryToReferenceLooks(scored, preferences.styleMemory),
  );
}

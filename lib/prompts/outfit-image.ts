import type { Preferences, ReferenceLook, SelectableStyle, StyleAnalysis } from "@/lib/schemas";

export function buildOutfitImagePrompt({
  analysis,
  preferences,
  style,
  editInstruction,
}: {
  analysis: StyleAnalysis;
  preferences: Preferences;
  style: SelectableStyle;
  editInstruction?: string;
}) {
  const resemblanceInstruction = {
    strong:
      "Use strong resemblance to visible styling cues and body proportions, without identity claims or exact try-on language.",
    balanced:
      "Use balanced inspiration: combine visible styling cues with editorial variety.",
    loose:
      "Use loose reference: prioritize palette, silhouette, and outfit vibe over close visual similarity.",
  }[preferences.resemblanceMode];

  return `Create one realistic full-body fashion outfit image for a travel style board.

This is an AI outfit inspiration image, not an exact try-on.
Do not identify the uploaded person.
Do not infer sensitive traits.
Do not sexualize the subject.
Do not include explicit or underwear-only clothing.
Do not include real brand logos, copyrighted team jerseys, or readable trademark text.

Look title: ${style.title}
Occasion: ${getOccasion(style)}
Fit: ${getFit(style)}
Outfit items: ${style.items.join(", ")}
Colors: ${getColors(style).join(", ")}
Prompt hint: ${getPromptHint(style)}

User preferences:
${JSON.stringify(preferences, null, 2)}

Photo styling analysis:
${JSON.stringify(analysis, null, 2)}

${resemblanceInstruction}
${editInstruction ? `Regeneration instruction for the full board: ${editInstruction}` : ""}

Generate only the outfit image. Do not add labels, typography, captions, item lists, or collage text. The frontend will render all text separately.`;
}

function isReferenceLook(style: SelectableStyle): style is ReferenceLook {
  return "referenceImageUrl" in style;
}

function getOccasion(style: SelectableStyle) {
  return isReferenceLook(style) ? style.occasion : style.bestFor;
}

function getFit(style: SelectableStyle) {
  return isReferenceLook(style) ? style.fit : style.vibe;
}

function getColors(style: SelectableStyle) {
  if (isReferenceLook(style)) {
    return style.colorMood.split("/").map((color) => color.trim()).filter(Boolean);
  }
  return style.colors;
}

function getPromptHint(style: SelectableStyle) {
  return isReferenceLook(style) ? style.promptHint : style.imagePromptHint;
}


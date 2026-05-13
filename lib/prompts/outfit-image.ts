import type { Preferences, StyleAnalysis, StyleCardData } from "@/lib/schemas";

export function buildOutfitImagePrompt({
  analysis,
  preferences,
  style,
  editInstruction,
}: {
  analysis: StyleAnalysis;
  preferences: Preferences;
  style: StyleCardData;
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

Style title: ${style.title}
Vibe: ${style.vibe}
Best for: ${style.bestFor}
Outfit items: ${style.items.join(", ")}
Colors: ${style.colors.join(", ")}
Footwear: ${style.footwear.join(", ")}
Accessories: ${style.accessories.join(", ")}
Prompt hint: ${style.imagePromptHint}

User preferences:
${JSON.stringify(preferences, null, 2)}

Photo styling analysis:
${JSON.stringify(analysis, null, 2)}

${resemblanceInstruction}
${editInstruction ? `Regeneration instruction for the full board: ${editInstruction}` : ""}

Generate only the outfit image. Do not add labels, typography, captions, item lists, or collage text. The frontend will render all text separately.`;
}

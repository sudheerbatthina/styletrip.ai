import type { Preferences, StyleAnalysis, StyleCardData } from "@/lib/schemas";

type BoardPromptInput = {
  analysis: StyleAnalysis;
  selectedStyles: StyleCardData[];
  preferences: Preferences;
  editInstruction?: string;
};

export function buildBoardGenerationPrompt({
  analysis,
  selectedStyles,
  preferences,
  editInstruction,
}: BoardPromptInput) {
  const referenceLine = preferences.usePhotoReferenceConsent
    ? "Use the uploaded person as a loose visual reference for body proportions, visible skin tone, hairstyle/glasses if visible, and general appearance."
    : "Do not recreate the uploaded person. Use the analysis only for styling guidance such as proportions, colors, and silhouettes.";

  const aspectRatioInstruction =
    preferences.aspectRatio === "4:5"
      ? "Create a 4:5 portrait fashion inspiration board."
      : preferences.aspectRatio === "16:9"
        ? "Create a 16:9 wide fashion inspiration board."
        : "Create a square 1:1 fashion inspiration board.";

  const resemblanceInstruction = {
    strong:
      "Resemblance mode: strong resemblance. Keep the model broadly aligned to visible proportions and styling cues, without identity claims or exact try-on language.",
    balanced:
      "Resemblance mode: balanced inspiration. Blend visible styling cues with editorial fashion-board variety.",
    loose:
      "Resemblance mode: loose reference. Use the photo mainly for color and fit guidance, not for close facial or identity similarity.",
  }[preferences.resemblanceMode];

  return `Generate an AI outfit inspiration board for the uploaded user photo.

${aspectRatioInstruction}

${referenceLine} ${resemblanceInstruction} Do not over-identify. Do not make it a formal office look. Make it a stylish vacation/trip lookbook.

Create a polished fashion collage with ${selectedStyles.length} numbered panels.

Each panel should show:
A full-body male model inspired by the style direction
One complete outfit
A short style title
A readable outfit item list

The board should look like a premium fashion moodboard:
Clean grid layout
High-quality realistic fashion photography
Vegas/travel-inspired backgrounds
Readable typography
Numbered style panels
Footer with best colors, footwear options, and accessory ideas

Aspect ratio: ${preferences.aspectRatio}.

Selected styles:
${JSON.stringify(selectedStyles, null, 2)}

User preferences:
${JSON.stringify(preferences, null, 2)}

Photo styling analysis:
${JSON.stringify(analysis, null, 2)}

${editInstruction ? `Refinement instruction: ${editInstruction}` : ""}

Styling rules:
The outfits should use the provided height only if the user entered it.
Use relaxed, flattering silhouettes.
Use warm skin-tone-friendly colors such as cream, taupe, olive, sage, mocha, rust, indigo, charcoal, white, and brown when appropriate.
Avoid overly formal officewear.
Avoid skinny pants.
Avoid extremely oversized clothes that shorten the frame.
Prefer straight-leg, relaxed, cropped, or tapered fits.
Use accessories like sunglasses, chain, watch, rings, cap, and crossbody bag.
Make each style clearly different.
Do not include explicit clothing.
Do not include underwear-only outfits.
Do not include brand logos unless generic/fake.
Do not create real copyrighted team jerseys; use generic racing/varsity graphics.
Do not add unreadable messy text.
Make the labels clean and legible.

Output only the generated image.`;
}

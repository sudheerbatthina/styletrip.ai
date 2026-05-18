import type { OneImageProviderInput } from "@/lib/ai/providers/types";

export const providerTestPromptVersions = [
  "v1-basic-look",
  "v2-full-body-fashion",
  "v3-strong-resemblance-safe",
] as const;

export type ProviderTestPromptVersion = (typeof providerTestPromptVersions)[number];

export const defaultProviderTestPromptVersion: ProviderTestPromptVersion =
  "v2-full-body-fashion";

export function buildProviderTestImagePrompt(input: OneImageProviderInput) {
  const promptVersion = normalizeProviderTestPromptVersion(input.promptVersion);
  const look = input.selectedReferenceLook;
  const referenceMode = input.referenceImage
    ? "Use the uploaded reference image for broad visual resemblance and styling guidance only."
    : "No user reference image was provided; create a generic fashion inspiration image.";
  const baseContext = [
    `Prompt version: ${promptVersion}.`,
    `Selected look: ${look.title}.`,
    `Occasion: ${look.occasion}.`,
    `Fit: ${look.fit}.`,
    `Color mood: ${look.colorMood}.`,
    `Items: ${look.items.join(", ")}.`,
    `Style hint: ${look.promptHint}.`,
    input.analysisSummary ? `Styling/profile summary: ${input.analysisSummary}.` : "",
    input.resemblanceMode ? `Resemblance mode: ${input.resemblanceMode}.` : "",
  ];

  const versionInstructions: Record<ProviderTestPromptVersion, string[]> = {
    "v1-basic-look": [
      "Create exactly one realistic fashion inspiration image.",
      referenceMode,
      "Use the selected reference look as styling inspiration.",
      "Show the outfit clearly in the requested styling context.",
    ],
    "v2-full-body-fashion": [
      "Create exactly one realistic full-body fashion inspiration image.",
      referenceMode,
      "Keep the full figure visible from head to feet with clean framing and no cropping.",
      "Make the outfit the visual focus: garments, shoes, silhouette, and colors should be easy to inspect.",
      "Use natural lighting and a clean editorial fashion-board look.",
      "This is inspiration, not exact try-on or guaranteed fit.",
    ],
    "v3-strong-resemblance-safe": [
      "Create exactly one realistic full-body fashion inspiration image.",
      referenceMode,
      "If a reference image is provided, preserve broad resemblance such as general face shape, hair feel, and styling vibe without identifying the person.",
      "Keep the full figure visible from head to feet with clean framing and no cropping.",
      "Make the selected reference look clearly recognizable through the outfit, fit, color mood, and item mix.",
      "This is resemblance-guided inspiration, not exact try-on or guaranteed fit.",
    ],
  };

  return [
    ...versionInstructions[promptVersion],
    ...baseContext,
    "Do not identify the person.",
    "Do not infer sensitive traits.",
    "Do not sexualize the subject.",
    "Do not create explicit content, underwear-only outfits, nudity, or medical/body judgments.",
    "Do not use real brand logos, copyrighted logos, or trademarked marks.",
    "Use tasteful styling, natural lighting, and a clean editorial fashion-board look.",
  ].filter(Boolean).join("\n");
}

export function summarizeProviderTestPrompt(input: OneImageProviderInput) {
  const look = input.selectedReferenceLook;
  const promptVersion = normalizeProviderTestPromptVersion(input.promptVersion);
  return `${promptVersion}: ${look.title} / ${look.occasion} / ${look.fit} / ${look.colorMood}`;
}

export function normalizeProviderTestPromptVersion(
  value: string | undefined,
): ProviderTestPromptVersion {
  if (
    value === "v1-basic-look" ||
    value === "v2-full-body-fashion" ||
    value === "v3-strong-resemblance-safe"
  ) {
    return value;
  }
  return defaultProviderTestPromptVersion;
}

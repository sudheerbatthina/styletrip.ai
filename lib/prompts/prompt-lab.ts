import type { ReferenceLook } from "@/lib/schemas";

export const promptLabPromptVersions = [
  "v4-chatgpt-style-board",
  "v5-chatgpt-try-different-styles",
  "v6-shopping-style-reference-board",
] as const;

export type PromptLabPromptVersion = (typeof promptLabPromptVersions)[number];

export type PromptLabContext = {
  boardTitle?: string | null;
  tripLocation?: string | null;
  tripType?: string | null;
  analysisSummary?: string | null;
  sourcePhotoAvailable?: boolean;
  selectedLooks: ReferenceLook[];
  promptVersion: PromptLabPromptVersion;
};

export function normalizePromptLabPromptVersion(value: unknown): PromptLabPromptVersion {
  return promptLabPromptVersions.includes(value as PromptLabPromptVersion)
    ? (value as PromptLabPromptVersion)
    : "v4-chatgpt-style-board";
}

export function buildPromptLabPrompt(context: PromptLabContext) {
  const version = normalizePromptLabPromptVersion(context.promptVersion);
  const selectedLooks = context.selectedLooks.length > 0 ? context.selectedLooks : [];
  const lookLines = selectedLooks.map((look, index) => {
    const pieces = [
      `${index + 1}. ${look.title}`,
      `occasion: ${look.occasion}`,
      `fit: ${look.fit}`,
      `colors: ${look.colorMood}`,
      `items: ${look.items.join(", ")}`,
      look.whyItFits ? `why it works: ${look.whyItFits}` : "",
    ].filter(Boolean);
    return pieces.join(" | ");
  });

  const modeInstruction = getVersionInstruction(version);
  const photoInstruction = context.sourcePhotoAvailable
    ? "Use the uploaded user photo as the visual reference for resemblance, styling context, proportions, and complexion-aware color choices. Do not identify the person."
    : "If no user photo is attached, create a style-board concept using the trip and reference looks only.";

  return [
    `Create a polished fashion lookbook/collage for ${context.boardTitle || "a StyleTrip board"}.`,
    photoInstruction,
    modeInstruction,
    "",
    "Trip context:",
    `- Location: ${context.tripLocation || "not specified"}`,
    `- Trip type: ${context.tripType || "vacation / travel styling"}`,
    context.analysisSummary ? `- Styling/profile notes: ${context.analysisSummary}` : "- Styling/profile notes: relaxed, practical trip outfits with strong visual variety.",
    "",
    "Selected reference looks to use as inspiration, not exact copies:",
    lookLines.length ? lookLines.join("\n") : "- Use 4 varied travel-ready looks based on the trip context.",
    "",
    "Output requirements:",
    "- Make the result a clean fashion lookbook/collage with numbered looks.",
    "- Each look should show a full-body outfit with head-to-toe visibility.",
    "- Include outfit item labels, colors, footwear, and accessories for each look.",
    "- The person should resemble the uploaded photo if one is provided, but this is inspiration, not an exact try-on or guarantee of fit.",
    "- Account for visible proportions, styling preferences, complexion-friendly colors, and the trip occasions without making sensitive assumptions.",
    "- Avoid formal officewear unless explicitly requested by the reference looks or trip context.",
    "- Avoid explicit clothing, sexualized posing, medical/body judgments, and real brand logos unless the user asks for specific brands.",
    "- Keep the design demo-ready: sharp, readable labels, varied poses, and cohesive board layout.",
  ].join("\n");
}

function getVersionInstruction(version: PromptLabPromptVersion) {
  if (version === "v5-chatgpt-try-different-styles") {
    return "Explore several clearly different style directions while keeping everything wearable for the trip. Emphasize useful variety over fashion jargon.";
  }
  if (version === "v6-shopping-style-reference-board") {
    return "Create a shopping-style reference board: focus on item clarity, labels, colors, footwear, accessories, and mix-and-match outfit logic. Do not include shopping links.";
  }
  return "Create a cohesive ChatGPT-style full fashion board with strong full-body visibility, numbered looks, and concise item labels.";
}

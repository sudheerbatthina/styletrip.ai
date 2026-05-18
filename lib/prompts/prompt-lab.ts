import type { ReferenceLook, StyleIdea } from "@/lib/schemas";

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
  occasionUseCase?: string | null;
  styleVibe?: string | null;
  outputTypePreference?: string | null;
  refinementInstruction?: string | null;
  analysisSummary?: string | null;
  sourcePhotoAvailable?: boolean;
  selectedLooks: ReferenceLook[];
  styleIdeas?: StyleIdea[];
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
  const styleIdeas = context.styleIdeas ?? [];
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
  const ideaLines = styleIdeas.map((idea, index) => {
    return `${index + 1}. ${idea.title} | ${idea.occasion} | ${idea.vibe} | palette: ${idea.palette.join(", ")} | key items: ${idea.keyItems.join(", ")} | why: ${idea.whyItWorks}`;
  });

  const modeInstruction = getVersionInstruction(version);
  const photoInstruction = context.sourcePhotoAvailable
    ? "Use the uploaded user photo as the visual reference for broad resemblance, styling context, visible proportions, and complexion-aware color choices. Do not identify the person."
    : "If no user photo is attached, create a styling concept from the context, style directions, and reference looks only.";

  return [
    `Create a polished fashion lookbook/collage for ${context.boardTitle || "a StyleTrip board"}.`,
    photoInstruction,
    modeInstruction,
    "",
    "Styling context:",
    `- What this is for: ${context.occasionUseCase || context.tripType || "not specified"}`,
    context.tripLocation ? `- Location/context: ${context.tripLocation}` : "- Location/context: not specified",
    context.styleVibe ? `- Desired style direction: ${context.styleVibe}` : "- Desired style direction: wearable, visually distinct outfits",
    context.outputTypePreference ? `- Output preference: ${context.outputTypePreference}` : "- Output preference: polished fashion board",
    context.refinementInstruction ? `- Latest refinement request: ${context.refinementInstruction}` : "- Latest refinement request: none",
    context.analysisSummary ? `- Styling/profile notes: ${context.analysisSummary}` : "- Styling/profile notes: use practical fashion-relevant observations only.",
    "",
    "Structured style directions:",
    ideaLines.length ? ideaLines.join("\n") : "- Create 4-6 varied wearable directions from the styling context.",
    "",
    "Selected reference looks to use as inspiration, not exact copies:",
    lookLines.length ? lookLines.join("\n") : "- Use 4-6 varied looks based on the style directions and context.",
    "",
    "Output requirements:",
    "- Make the result a clean fashion lookbook/collage with numbered looks.",
    "- Generate 4-6 distinct full-body looks unless the context requests a different count.",
    "- Each look should show head-to-toe visibility with no cropped heads or feet.",
    "- Include outfit item labels, colors, footwear, and accessories for each look.",
    "- The person should resemble the uploaded photo if one is provided, but this is inspiration, not exact try-on or guaranteed fit.",
    "- Account for visible proportions, styling preferences, complexion-friendly colors, occasions, and refinement notes without making sensitive assumptions.",
    "- Avoid formal officewear unless explicitly requested.",
    "- Avoid explicit clothing, sexualized posing, medical/body judgments, and real brand logos unless the user asks for specific brands.",
    "- Keep the design demo-ready: sharp, readable labels, varied looks, and cohesive board layout.",
  ].join("\n");
}

function getVersionInstruction(version: PromptLabPromptVersion) {
  if (version === "v5-chatgpt-try-different-styles") {
    return "Create a follow-up variation board: try noticeably different styles while preserving the user's appearance, preferences, liked signals, and practical context.";
  }
  if (version === "v6-shopping-style-reference-board") {
    return "Create a shopping-style reference board: focus on clear item names, colors, silhouettes, footwear, accessories, and budget-friendly searchable wording. Do not include shopping links.";
  }
  return "Create a cohesive ChatGPT-style full fashion board with strong full-body visibility, numbered looks, concise item labels, and polished visual variety.";
}
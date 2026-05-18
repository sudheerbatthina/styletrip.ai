import type { Preferences, ReferenceLook, StyleAnalysis, StyleIdea } from "@/lib/schemas";

export function buildPersonalizedGenerationPrompt({
  analysis,
  preferences,
  selectedLooks,
  styleIdeas = [],
  refinementInstruction,
}: {
  analysis: StyleAnalysis;
  preferences: Preferences;
  selectedLooks: ReferenceLook[];
  styleIdeas?: StyleIdea[];
  refinementInstruction?: string;
}) {
  return [
    "Create a clean fashion lookbook board from the selected style directions.",
    "Use uploaded photo context for styling guidance and resemblance only; this is not exact try-on.",
    "Keep full-body head-to-toe visibility, consistent person appearance, clear outfit details, and readable labels when board output is requested.",
    "Avoid explicit clothing, random extra people, real brand logos, cropped heads/feet, and formal officewear unless requested.",
    `Occasion/use case: ${preferences.occasionUseCase || preferences.tripType || "general styling"}`,
    `Output type: ${preferences.outputTypePreference || "final board"}`,
    `Resemblance: ${preferences.resemblanceMode}`,
    `Board ratio: ${preferences.aspectRatio}`,
    refinementInstruction ? `Latest refinement: ${refinementInstruction}` : "",
    "Photo analysis:",
    JSON.stringify(analysis, null, 2),
    "Style ideas:",
    JSON.stringify(styleIdeas, null, 2),
    "Selected reference looks:",
    JSON.stringify(selectedLooks, null, 2),
  ].filter(Boolean).join("\n");
}

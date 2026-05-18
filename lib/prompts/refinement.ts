import type { Preferences, StyleAnalysis, StyleIdea } from "@/lib/schemas";

export function buildRefinementPrompt({
  analysis,
  preferences,
  currentIdeas,
  instruction,
}: {
  analysis: StyleAnalysis;
  preferences: Preferences;
  currentIdeas: StyleIdea[];
  instruction: string;
}) {
  return [
    "Update the existing style ideas according to the user's refinement instruction without restarting from scratch.",
    "Preserve uploaded-photo context, user preferences, liked signals, and safety constraints.",
    "Change only the requested styling direction: casual/formal/color/luxury/streetwear/summer/Vegas/night/footwear/pattern/item avoidance/etc.",
    `Refinement instruction: ${instruction}`,
    `Use case: ${preferences.occasionUseCase || preferences.tripType || "general styling"}`,
    "Photo analysis:",
    JSON.stringify(analysis, null, 2),
    "Current style ideas:",
    JSON.stringify(currentIdeas, null, 2),
  ].join("\n");
}

export function refineMockStyleIdeas(currentIdeas: StyleIdea[], instruction: string): StyleIdea[] {
  const lower = instruction.toLowerCase();
  return currentIdeas.map((idea, index) => {
    const palette = lower.includes("color") || lower.includes("colour")
      ? Array.from(new Set(["cobalt", "rust", "cream", ...idea.palette])).slice(0, 5)
      : idea.palette;
    const footwear = lower.includes("footwear") || lower.includes("shoe")
      ? ["updated footwear based on request", ...idea.footwear].slice(0, 3)
      : idea.footwear;
    const vibe = lower.includes("casual")
      ? `more casual ${idea.vibe}`
      : lower.includes("luxury")
        ? `more elevated ${idea.vibe}`
        : lower.includes("street")
          ? `more streetwear ${idea.vibe}`
          : idea.vibe;
    return {
      ...idea,
      vibe,
      palette,
      footwear,
      generationBrief: `${idea.generationBrief} Refinement ${index + 1}: ${instruction}.`,
      whyItWorks: `${idea.whyItWorks} Updated based on: ${instruction}.`,
      searchKeywords: Array.from(new Set([...idea.searchKeywords, ...instruction.split(/\s+/).slice(0, 5)])).slice(0, 12),
    };
  });
}

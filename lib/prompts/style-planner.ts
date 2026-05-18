import type { Preferences, StyleAnalysis, StyleIdea, StylePlan } from "@/lib/schemas";

export function buildStylePlannerPrompt({
  analysis,
  preferences,
  referenceContext,
}: {
  analysis: StyleAnalysis;
  preferences: Preferences;
  referenceContext?: string;
}) {
  return [
    "Create structured, wearable style ideas from the uploaded-photo fashion analysis and user context.",
    "Do not identify the person, infer sensitive traits, or make medical/body judgments.",
    "Use practical styling language and keep styles visually distinct.",
    "Return strict JSON with styleIdeas, overallDirection, and questionsOrUncertainty.",
    "",
    `Use case: ${preferences.occasionUseCase || preferences.tripType || "general styling"}`,
    `Location/context: ${preferences.tripLocation || "not specified"}`,
    `Weather/season: ${preferences.weatherSeason || "not specified"}`,
    `Style direction: ${preferences.styleVibe || preferences.genderStyleDirection || "open"}`,
    `Budget: ${preferences.budgetRange}`,
    `Preferred fit: ${preferences.preferredFit}`,
    `Favorite colors: ${preferences.favoriteColors || "not specified"}`,
    `Colors to avoid: ${preferences.colorsToAvoid || "not specified"}`,
    `Disliked styles: ${preferences.dislikedStyles || "not specified"}`,
    `Comfort/modesty notes: ${preferences.comfortModestyNotes || "not specified"}`,
    `Output preference: ${preferences.outputTypePreference || "reference ideas"}`,
    "",
    "Photo analysis:",
    JSON.stringify(analysis, null, 2),
    referenceContext ? `Reference context: ${referenceContext}` : "",
  ].filter(Boolean).join("\n");
}

export function buildMockStylePlan(analysis: StyleAnalysis, preferences: Preferences): StylePlan {
  const occasionFocus = preferences.occasionTypes.length ? preferences.occasionTypes : [preferences.occasionUseCase || preferences.tripType || "everyday style"];
  const context = [preferences.occasionUseCase, preferences.tripLocation, preferences.weatherSeason].filter(Boolean).join(" / ") || "general styling";
  const vibe = preferences.styleVibe || preferences.genderStyleDirection || "clean wearable style";
  const favoriteColors = splitPreferenceList(preferences.favoriteColors);
  const palette = favoriteColors.length ? favoriteColors : analysis.recommendedColorPalette.slice(0, 4);
  const avoidText = [preferences.dislikedStyles, preferences.colorsToAvoid, ...analysis.visibleStyleProfile.avoidAdvice].filter(Boolean).join("; ");
  const baseIdeas = [
    {
      title: "Relaxed Signature Look",
      vibe: `easy ${vibe}`,
      items: ["textured overshirt", "clean tee", "relaxed trousers", "minimal sneakers"],
      footwear: ["minimal sneakers"],
      accessories: ["watch", "simple sunglasses"],
    },
    {
      title: "Polished Casual Look",
      vibe: `refined ${vibe}`,
      items: ["camp collar shirt", "tailored relaxed pants", "light layer"],
      footwear: ["loafers or clean sneakers"],
      accessories: ["belt", "subtle chain"],
    },
    {
      title: "Color-Forward Look",
      vibe: "more colorful but wearable",
      items: ["palette-led shirt", "neutral base pant", "tonal layer"],
      footwear: ["neutral sneakers"],
      accessories: ["color-matched cap"],
    },
    {
      title: "Comfort Movement Look",
      vibe: "comfortable practical style",
      items: ["soft knit or overshirt", "breathable top", "easy pants"],
      footwear: ["cushioned sneakers"],
      accessories: ["crossbody bag"],
    },
    {
      title: "Evening Statement Look",
      vibe: "photo-ready statement style",
      items: ["statement shirt", "dark relaxed trouser", "clean underlayer"],
      footwear: ["sleek sneakers or loafers"],
      accessories: ["ring", "watch"],
    },
    {
      title: "Minimal Monochrome Look",
      vibe: "minimal tonal style",
      items: ["tonal shirt", "matching relaxed pants", "structured layer"],
      footwear: ["tonal sneakers"],
      accessories: ["simple bag"],
    },
  ];

  const count = Math.max(4, Math.min(6, preferences.numberOfStyleIdeas || 6));
  const styleIdeas: StyleIdea[] = baseIdeas.slice(0, count).map((idea, index) => {
    const occasion = occasionFocus[index % occasionFocus.length] || context;
    const ideaPalette = uniqueStrings([...palette, ...analysis.recommendedColorPalette]).slice(index % 2, index % 2 + 4);
    return {
      id: `idea-${index + 1}-${slugify(idea.title)}`,
      title: idea.title,
      occasion,
      vibe: idea.vibe,
      fit: preferences.preferredFit,
      palette: ideaPalette.length ? ideaPalette : ["cream", "olive", "indigo"],
      keyItems: idea.items,
      footwear: idea.footwear,
      accessories: idea.accessories,
      whyItWorks: `${idea.title} fits ${context} with ${preferences.preferredFit} proportions, practical layering, and colors guided by the photo styling profile.`,
      searchKeywords: buildSearchKeywords({ preferences, ideaTitle: idea.title, occasion, palette: ideaPalette, items: idea.items }),
      generationBrief: `Create a full-body ${idea.vibe} outfit for ${context}: ${idea.items.join(", ")}; palette ${ideaPalette.join(", ")}; avoid ${avoidText || "overly formal or logo-heavy styling"}.`,
      avoidNotes: [avoidText || "Avoid overly formal officewear unless requested.", "Avoid cropped head/feet and unclear outfit details."],
    };
  });

  return {
    styleIdeas,
    overallDirection: `Create ${count} visually distinct looks for ${context}, balancing ${vibe}, ${preferences.preferredFit} fit, and complexion-friendly color choices from the photo analysis.`,
    questionsOrUncertainty: analysis.confidenceNotes ? [analysis.confidenceNotes] : [],
  };
}

function buildSearchKeywords({ preferences, ideaTitle, occasion, palette, items }: { preferences: Preferences; ideaTitle: string; occasion: string; palette: string[]; items: string[] }) {
  const location = preferences.tripLocation && preferences.tripLocation.toLowerCase() !== "none" ? preferences.tripLocation : "";
  return uniqueStrings([
    preferences.genderStyleDirection || "style outfit",
    preferences.styleVibe || "wearable outfit",
    preferences.weatherSeason || "",
    occasion,
    location,
    ideaTitle,
    preferences.preferredFit,
    ...palette,
    ...items.slice(0, 3),
  ].filter(Boolean)).slice(0, 10);
}

function splitPreferenceList(value?: string) {
  return (value ?? "").split(/[\n,\/]/).map((item) => item.trim()).filter(Boolean);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

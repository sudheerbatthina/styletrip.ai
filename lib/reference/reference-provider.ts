import { mockStyleCards } from "@/lib/mock-data";
import type {
  InternalStylePlan,
  Preferences,
  ReferenceLook,
  StyleAnalysis,
  StyleCardData,
} from "@/lib/schemas";

const defaultOccasions = ["airport", "daytime walking", "dinner", "casual night"];

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function escapeSvg(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildReferenceSvg(style: StyleCardData, index: number, fit: string) {
  const palettes = [
    ["#f6efe4", "#123d52", "#b9815d", "#5d6f57"],
    ["#edf2ed", "#243447", "#c9a66b", "#7f8f7a"],
    ["#f5ecec", "#382f35", "#b65f4d", "#d9c5aa"],
    ["#eef3f6", "#19384a", "#6d8a96", "#e4d6bd"],
  ];
  const [background, ink, accent, soft] = palettes[index % palettes.length];
  const title = escapeSvg(style.title);
  const itemOne = escapeSvg(style.items[0] ?? "relaxed top");
  const itemTwo = escapeSvg(style.items[1] ?? "easy pants");
  const itemThree = escapeSvg(style.items[2] ?? "clean shoes");

  return svgDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1200" viewBox="0 0 960 1200"><rect width="960" height="1200" fill="${background}"/><rect x="80" y="78" width="800" height="1044" rx="28" fill="#fffaf2" stroke="#cfbfaa" stroke-width="3"/><rect x="140" y="150" width="680" height="720" rx="26" fill="${soft}"/><circle cx="480" cy="292" r="78" fill="${accent}" opacity="0.9"/><rect x="372" y="390" width="216" height="260" rx="38" fill="${ink}"/><path d="M350 410c-62 56-94 137-96 244h112c7-91 32-159 74-204z" fill="${accent}"/><path d="M610 410c62 56 94 137 96 244H594c-7-91-32-159-74-204z" fill="${accent}"/><rect x="342" y="650" width="118" height="290" rx="30" fill="#35483f"/><rect x="500" y="650" width="118" height="290" rx="30" fill="#35483f"/><rect x="286" y="930" width="190" height="42" rx="21" fill="#22282d"/><rect x="484" y="930" width="190" height="42" rx="21" fill="#22282d"/><rect x="140" y="902" width="680" height="2" fill="#cfbfaa"/><text x="140" y="970" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="${ink}">${title}</text><text x="140" y="1018" font-family="Arial, sans-serif" font-size="24" fill="#52616b">${escapeSvg(fit)} fit reference</text><text x="140" y="1070" font-family="Arial, sans-serif" font-size="24" fill="${ink}">${itemOne} / ${itemTwo}</text><text x="140" y="1106" font-family="Arial, sans-serif" font-size="24" fill="${ink}">${itemThree}</text></svg>`,
  );
}

function getOccasion(style: StyleCardData, preferences: Preferences, index: number) {
  const options = preferences.occasionTypes.length > 0
    ? preferences.occasionTypes
    : defaultOccasions;
  const lower = style.bestFor.toLowerCase();
  return options.find((occasion) => lower.includes(occasion.toLowerCase())) ?? options[index % options.length];
}

function getColorMood(style: StyleCardData) {
  return style.colors.slice(0, 3).join(" / ");
}

export function getMockStylePlan(
  analysis: StyleAnalysis,
  preferences: Preferences,
): InternalStylePlan {
  const occasionFocus = preferences.occasionTypes.length > 0
    ? preferences.occasionTypes
    : defaultOccasions;

  return {
    stylePlanId: `mock-plan-${occasionFocus.join("-").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
    occasionFocus,
    recommendedDirections: mockStyleCards.slice(0, 8).map((style, index) => ({
      id: `direction-${index + 1}`,
      title: style.title,
      reason: style.whyItFitsUser,
      colors: style.colors,
      silhouettes: analysis.recommendedSilhouettes.slice(0, 2),
      avoid: [style.avoidIf, ...analysis.visibleStyleProfile.avoidAdvice.slice(0, 1)],
      occasion: getOccasion(style, preferences, index),
    })),
    overallGuidance:
      "Use relaxed trip outfits with clear proportions, practical layers, and colors that connect back to the uploaded styling reference. Reference looks are inspiration, not exact try-on.",
  };
}

export function getMockReferenceLooks(
  analysis: StyleAnalysis,
  preferences: Preferences,
): ReferenceLook[] {
  const target = Math.max(8, Math.min(16, preferences.numberOfStyleIdeas));

  return mockStyleCards.slice(0, target).map((style, index) => ({
    id: `look-${index + 1}`,
    title: style.title,
    occasion: getOccasion(style, preferences, index),
    fit: preferences.preferredFit,
    colorMood: getColorMood(style),
    items: style.items.slice(0, 4),
    whyItFits: style.whyItFitsUser,
    referenceImageUrl: buildReferenceSvg(style, index, preferences.preferredFit),
    source: "mock",
    sourceUrl: null,
    promptHint: style.imagePromptHint,
    selected: false,
  }));
}

export function getReferenceLooksForPlan({
  analysis,
  preferences,
}: {
  analysis: StyleAnalysis;
  preferences: Preferences;
}) {
  // TODO: Add a Pexels provider for licensed editorial-style references.
  // TODO: Add an Unsplash provider for curated travel/fashion-safe references.
  // TODO: Add a curated fashion catalog provider owned by StyleTrip.
  // TODO: Add retailer/product feed providers when shopping links are enabled.
  return {
    stylePlan: getMockStylePlan(analysis, preferences),
    referenceLooks: getMockReferenceLooks(analysis, preferences),
  };
}

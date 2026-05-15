import { scoreMockReferenceLooks } from "@/lib/matching/mock-match-scorer";
import {
  getCuratedReferenceLooks,
  mockStyleCards,
  type ReferenceProviderInput,
} from "@/lib/reference/providers/curated-provider";
import { getPexelsReferenceLooks, getPexelsStatus } from "@/lib/reference/providers/pexels-provider";
import { getUnsplashReferenceLooks, getUnsplashStatus } from "@/lib/reference/providers/unsplash-provider";
import type {
  InternalStylePlan,
  Preferences,
  ReferenceLook,
  StyleAnalysis,
} from "@/lib/schemas";

const defaultOccasions = ["airport", "daytime walking", "dinner", "casual night"];
type ReferenceImageProvider = "curated" | "pexels" | "unsplash";

function getReferenceProvider(): ReferenceImageProvider {
  const provider = process.env.REFERENCE_IMAGE_PROVIDER;
  if (provider === "pexels" || provider === "unsplash" || provider === "curated") {
    return provider;
  }
  return "curated";
}

function getReferenceProviderMaxResults() {
  const value = Number(process.env.REFERENCE_PROVIDER_MAX_RESULTS ?? 24);
  return Number.isFinite(value) ? Math.max(4, Math.min(24, Math.floor(value))) : 24;
}

function getReferenceTarget(preferences: Preferences) {
  return Math.min(
    getReferenceProviderMaxResults(),
    Math.max(16, preferences.numberOfStyleIdeas + 12),
  );
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
      occasion: preferences.occasionTypes[index % Math.max(preferences.occasionTypes.length, 1)] ?? defaultOccasions[index % defaultOccasions.length],
    })),
    overallGuidance:
      "Use relaxed trip outfits with clear proportions, practical layers, and colors that connect back to the uploaded styling reference. Reference looks are inspiration, not exact try-on.",
  };
}

export async function getMockReferenceLooks(
  analysis: StyleAnalysis,
  preferences: Preferences,
): Promise<ReferenceLook[]> {
  const target = getReferenceTarget(preferences);
  const input: ReferenceProviderInput = { analysis, preferences, target };
  const looks = await getProviderReferenceLooks(input);
  return scoreMockReferenceLooks({ looks, analysis, preferences });
}

export async function getReferenceLooksForPlan({
  analysis,
  preferences,
}: {
  analysis: StyleAnalysis;
  preferences: Preferences;
}) {
  return {
    stylePlan: getMockStylePlan(analysis, preferences),
    referenceLooks: await getMockReferenceLooks(analysis, preferences),
  };
}

async function getProviderReferenceLooks(input: ReferenceProviderInput) {
  const curatedLooks = await getCuratedReferenceLooks(input);
  const provider = getReferenceProvider();

  if (provider === "curated") {
    return curatedLooks;
  }

  try {
    const externalLooks = provider === "pexels"
      ? await getPexelsLooksIfEnabled(input)
      : await getUnsplashLooksIfEnabled(input);

    return mergeWithCuratedFallback(externalLooks, curatedLooks, input.target);
  } catch (error) {
    console.warn(`Reference provider ${provider} failed; falling back to curated.`, error);
    return curatedLooks;
  }
}

async function getPexelsLooksIfEnabled(input: ReferenceProviderInput) {
  const status = getPexelsStatus();
  if (!status.enabled) {
    console.warn(status.reason);
    return [];
  }
  return getPexelsReferenceLooks(input);
}

async function getUnsplashLooksIfEnabled(input: ReferenceProviderInput) {
  const status = getUnsplashStatus();
  if (!status.enabled) {
    console.warn(status.reason);
    return [];
  }
  return getUnsplashReferenceLooks(input);
}

function mergeWithCuratedFallback(
  externalLooks: ReferenceLook[],
  curatedLooks: ReferenceLook[],
  target: number,
) {
  const merged = new Map<string, ReferenceLook>();
  for (const look of externalLooks) {
    if (look.referenceImageUrl) {
      merged.set(look.id, look);
    }
  }
  for (const look of curatedLooks) {
    if (merged.size >= target) {
      break;
    }
    if (!merged.has(look.id)) {
      merged.set(look.id, look);
    }
  }
  return Array.from(merged.values()).slice(0, target);
}

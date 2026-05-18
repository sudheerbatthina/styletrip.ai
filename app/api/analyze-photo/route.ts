import { NextResponse } from "next/server";
import {
  getProviderStatus,
  getTextProviderId,
  isMockMode,
  isPaidImageGenerationEnabled,
} from "@/lib/ai/provider-router";
import { analyzePhotoRequestSchema } from "@/lib/schemas";
import { mockAnalysis } from "@/lib/mock-data";
import type { Preferences, StyleAnalysis } from "@/lib/schemas";

export const runtime = "nodejs";

function buildMockDynamicAnalysis(preferences: Preferences): StyleAnalysis {
  const occasion = preferences.occasionUseCase || preferences.tripType || "everyday styling";
  const locationNote = preferences.tripLocation
    ? ` for ${preferences.tripLocation}`
    : "";

  return {
    ...mockAnalysis,
    dynamicPhotoAnalysis: {
      frameNotes: mockAnalysis.visibleStyleProfile.bodyFrame,
      proportions: mockAnalysis.visibleStyleProfile.proportionNotes,
      currentOutfit: mockAnalysis.visibleStyleProfile.currentOutfitNotes,
      colorStyling: mockAnalysis.visibleStyleProfile.skinToneStylingNotes,
      fitAdvice: mockAnalysis.visibleStyleProfile.fitAdvice,
      avoid: mockAnalysis.visibleStyleProfile.avoidAdvice,
      recommendedPalette: mockAnalysis.recommendedColorPalette,
      recommendedSilhouettes: mockAnalysis.recommendedSilhouettes,
      styleDirections: [
        `${preferences.preferredFit} ${occasion}${locationNote}`,
        preferences.styleVibe || "wearable visual variety",
        preferences.outputTypePreference || "reference ideas",
      ].filter(Boolean),
      uncertaintyNotes:
        "Mock analysis for local development. A real analyzer should describe uncertainty when the photo is unclear or not full body.",
    },
  };
}
function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = analyzePhotoRequestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Invalid request.");
    }

    const textProvider = getTextProviderId();
    if (isMockMode() || textProvider === "mock") {
      return NextResponse.json(buildMockDynamicAnalysis(parsed.data.preferences));
    }

    if (!isPaidImageGenerationEnabled()) {
      return jsonError(
        "Paid providers are disabled. Use NEXT_PUBLIC_MOCK_MODE=true or AI_TEXT_PROVIDER=mock for local testing.",
        402,
      );
    }

    const providerStatus = getProviderStatus(textProvider);
    if (!providerStatus.enabled) {
      return jsonError(
        providerStatus.reason ?? `${textProvider} text analysis provider is not enabled yet.`,
        providerStatus.missingKey ? 400 : 501,
      );
    }

    return jsonError(
      `${textProvider} text analysis provider is not enabled yet. Use NEXT_PUBLIC_MOCK_MODE=true or AI_TEXT_PROVIDER=mock for local testing.`,
      501,
    );
  } catch (error) {
    console.error("analyze-photo failed", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to analyze photo.",
      500,
    );
  }
}

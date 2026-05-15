import { NextResponse } from "next/server";
import { getImageProviderId, getProviderStatus } from "@/lib/ai/provider-router";
import { estimateBoardGenerationCost } from "@/lib/cost/cost-estimator";
import { buildMockOutfitImage } from "@/lib/mock-data";
import {
  outfitImagesRequestSchema,
  outfitImagesResponseSchema,
} from "@/lib/schemas";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = outfitImagesRequestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Invalid request.");
    }

    const { selectedStyles } = parsed.data;
    const imageProvider = getImageProviderId();
    const costEstimate = estimateBoardGenerationCost({
      imageCount: selectedStyles.length,
    });

    if (costEstimate.mode === "blocked") {
      return jsonError(costEstimate.reason, 402);
    }

    if (imageProvider === "mock") {
      return NextResponse.json(
        outfitImagesResponseSchema.parse({
          outfitImages: selectedStyles.map((style, index) => ({
            styleId: style.id,
            image: buildMockOutfitImage(style.title, index),
            promptUsed: "mock-reference-look-mode",
          })),
        }),
      );
    }

    const providerStatus = getProviderStatus(imageProvider);
    if (!providerStatus.enabled) {
      return jsonError(
        providerStatus.reason ?? `${imageProvider} provider is not enabled yet.`,
        501,
      );
    }

    return jsonError(
      `${imageProvider} provider is not implemented yet. Mock mode remains available for $0 generation.`,
      501,
    );
  } catch (error) {
    console.error("generate-outfit-images failed", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to generate outfit images.",
      500,
    );
  }
}

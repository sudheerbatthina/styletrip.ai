import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getMaxRealTestImages,
  getProviderStatus,
  isProviderTestLabVisible,
  type AiProviderId,
} from "@/lib/ai/provider-router";
import { generateFalProviderTestImage } from "@/lib/ai/providers/fal-provider";
import { generateGeminiProviderTestImage } from "@/lib/ai/providers/gemini-provider";
import { generateMockProviderTestImage } from "@/lib/ai/providers/mock-provider";
import { generateOpenAiProviderTestImage } from "@/lib/ai/providers/openai-provider";
import type { OneImageProviderInput } from "@/lib/ai/providers/types";
import { estimateBoardGenerationCost } from "@/lib/cost/cost-estimator";
import {
  imageInputSchema,
  referenceLookSchema,
} from "@/lib/schemas";

export const runtime = "nodejs";

const providerTestRequestSchema = z.object({
  provider: z.enum(["mock", "openai", "gemini", "fal"]),
  selectedReferenceLook: referenceLookSchema,
  analysisSummary: z.string().max(1000).optional().default(""),
  resemblanceMode: z.string().max(80).optional().default("balanced"),
  image: imageInputSchema.nullable().optional(),
  explicitConfirm: z.boolean(),
});

function jsonResponse(
  body: {
    status: "success" | "blocked" | "error";
    provider: AiProviderId;
    estimatedCostUsd: number;
    imageUrlOrBase64?: string | null;
    message: string;
    metadata?: Record<string, unknown>;
  },
  status = 200,
) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  try {
    if (!isProviderTestLabVisible()) {
      return jsonResponse(
        {
          status: "blocked",
          provider: "mock",
          estimatedCostUsd: 0,
          imageUrlOrBase64: null,
          message: "Provider Test Lab is hidden. Set SHOW_PROVIDER_TEST_LAB=true or run in development.",
          metadata: { labVisible: false },
        },
        403,
      );
    }

    const body = await request.json();
    const parsed = providerTestRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(
        {
          status: "error",
          provider: "mock",
          estimatedCostUsd: 0,
          imageUrlOrBase64: null,
          message: parsed.error.errors[0]?.message ?? "Invalid provider test request.",
        },
        400,
      );
    }

    const input = parsed.data;
    const maxTestImages = getMaxRealTestImages();
    if (maxTestImages !== 1) {
      return jsonResponse(
        {
          status: "blocked",
          provider: input.provider,
          estimatedCostUsd: 0,
          imageUrlOrBase64: null,
          message: "Provider Test Lab is hard-limited to exactly 1 image.",
          metadata: { maxTestImages },
        },
        400,
      );
    }

    if (!input.explicitConfirm) {
      return jsonResponse(
        {
          status: "blocked",
          provider: input.provider,
          estimatedCostUsd: 0,
          imageUrlOrBase64: null,
          message: "Explicit confirmation is required before one-image provider testing.",
        },
        400,
      );
    }

    const estimate = estimateBoardGenerationCost({
      imageCount: 1,
      imageProvider: input.provider,
      textProvider: "mock",
      mockMode: input.provider === "mock",
    });

    if (estimate.mode === "blocked") {
      return jsonResponse(
        {
          status: "blocked",
          provider: input.provider,
          estimatedCostUsd: estimate.estimatedTotalCostUsd,
          imageUrlOrBase64: null,
          message: estimate.reason,
          metadata: { estimate },
        },
        402,
      );
    }

    const providerStatus = getProviderStatus(input.provider);
    if (!providerStatus.enabled) {
      return jsonResponse(
        {
          status: "blocked",
          provider: input.provider,
          estimatedCostUsd: estimate.estimatedTotalCostUsd,
          imageUrlOrBase64: null,
          message: providerStatus.reason ?? `${input.provider} provider is not enabled.`,
          metadata: { estimate, providerStatus },
        },
        providerStatus.missingKey ? 400 : 501,
      );
    }

    const providerInput: OneImageProviderInput = {
      provider: input.provider,
      selectedReferenceLook: input.selectedReferenceLook,
      referenceImage: input.image ?? null,
      analysisSummary: input.analysisSummary,
      resemblanceMode: input.resemblanceMode,
      explicitConfirm: input.explicitConfirm,
    };
    const result = await generateOneImage(providerInput);

    return jsonResponse({
      status: "success",
      provider: input.provider,
      estimatedCostUsd: estimate.estimatedTotalCostUsd,
      imageUrlOrBase64: result.imageUrlOrBase64,
      message:
        input.provider === "mock"
          ? "Mock provider test generated one local image. No paid APIs were called."
          : "Provider test completed.",
      metadata: {
        estimate,
        ...result.metadata,
        maxImages: 1,
      },
    });
  } catch (error) {
    return jsonResponse(
      {
        status: "error",
        provider: "mock",
        estimatedCostUsd: 0,
        imageUrlOrBase64: null,
        message: error instanceof Error ? error.message : "Provider test failed.",
      },
      500,
    );
  }
}

function generateOneImage(input: OneImageProviderInput) {
  if (input.provider === "mock") {
    return generateMockProviderTestImage(input);
  }
  if (input.provider === "openai") {
    return generateOpenAiProviderTestImage(input);
  }
  if (input.provider === "gemini") {
    return generateGeminiProviderTestImage(input);
  }
  return generateFalProviderTestImage(input);
}

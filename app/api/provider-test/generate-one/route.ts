import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getMaxRealTestImages,
  getProviderStatus,
  isProviderTestLabExplicitlyEnabled,
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
  buildProviderTestImagePrompt,
  defaultProviderTestPromptVersion,
  normalizeProviderTestPromptVersion,
  providerTestPromptVersions,
} from "@/lib/prompts/provider-test-image-prompt";
import {
  persistProviderTestRun,
  type ProviderTestRunStatus,
} from "@/lib/provider-test/provider-test-runs";
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
  promptVersion: z.enum(providerTestPromptVersions).optional().default(defaultProviderTestPromptVersion),
  image: imageInputSchema.nullable().optional(),
  explicitConfirm: z.boolean(),
});

type ProviderTestRequest = z.infer<typeof providerTestRequestSchema>;

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
  let requestedProvider: AiProviderId = "mock";
  let lastProviderInput: OneImageProviderInput | null = null;
  let lastEstimateUsd = 0;
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
    requestedProvider = input.provider;
    if (input.provider !== "mock" && !isProviderTestLabExplicitlyEnabled()) {
      const persistence = await persistRequestRun(input, "blocked", {
        errorMessage: "Real provider testing requires SHOW_PROVIDER_TEST_LAB=true.",
        metadata: { showProviderTestLab: false },
      });
      return jsonResponse(
        {
          status: "blocked",
          provider: input.provider,
          estimatedCostUsd: 0,
          imageUrlOrBase64: null,
          message: "Real provider testing requires SHOW_PROVIDER_TEST_LAB=true.",
          metadata: { showProviderTestLab: false, persistence },
        },
        403,
      );
    }

    const maxTestImages = getMaxRealTestImages();
    if (maxTestImages !== 1) {
      const persistence = await persistRequestRun(input, "blocked", {
        errorMessage: "Provider Test Lab is hard-limited to exactly 1 image.",
        metadata: { maxTestImages },
      });
      return jsonResponse(
        {
          status: "blocked",
          provider: input.provider,
          estimatedCostUsd: 0,
          imageUrlOrBase64: null,
          message: "Provider Test Lab is hard-limited to exactly 1 image.",
          metadata: { maxTestImages, persistence },
        },
        400,
      );
    }

    if (!input.explicitConfirm) {
      const persistence = await persistRequestRun(input, "blocked", {
        errorMessage: "Explicit confirmation is required before one-image provider testing.",
      });
      return jsonResponse(
        {
          status: "blocked",
          provider: input.provider,
          estimatedCostUsd: 0,
          imageUrlOrBase64: null,
          message: "Explicit confirmation is required before one-image provider testing.",
          metadata: { persistence },
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
    lastEstimateUsd = estimate.estimatedTotalCostUsd;

    if (estimate.mode === "blocked") {
      const persistence = await persistRequestRun(input, "blocked", {
        estimatedCostUsd: estimate.estimatedTotalCostUsd,
        errorMessage: estimate.reason,
        metadata: { estimate },
      });
      return jsonResponse(
        {
          status: "blocked",
          provider: input.provider,
          estimatedCostUsd: estimate.estimatedTotalCostUsd,
          imageUrlOrBase64: null,
          message: estimate.reason,
          metadata: { estimate, persistence },
        },
        402,
      );
    }

    const providerStatus = getProviderStatus(input.provider);
    if (!providerStatus.enabled) {
      const persistence = await persistRequestRun(input, "blocked", {
        estimatedCostUsd: estimate.estimatedTotalCostUsd,
        errorMessage: providerStatus.reason ?? `${input.provider} provider is not enabled.`,
        metadata: { estimate, providerStatus },
      });
      return jsonResponse(
        {
          status: "blocked",
          provider: input.provider,
          estimatedCostUsd: estimate.estimatedTotalCostUsd,
          imageUrlOrBase64: null,
          message: providerStatus.reason ?? `${input.provider} provider is not enabled.`,
          metadata: { estimate, providerStatus, persistence },
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
      promptVersion: input.promptVersion,
      explicitConfirm: input.explicitConfirm,
    };
    lastProviderInput = providerInput;
    const result = await generateOneImage(providerInput);
    const persistence = await persistProviderTestRun({
      provider: input.provider,
      model: result.metadata.model ?? null,
      status: "success",
      selectedReferenceLook: input.selectedReferenceLook,
      promptVersion: normalizeProviderTestPromptVersion(result.metadata.promptVersion),
      promptUsed: result.metadata.promptUsed ?? buildProviderTestImagePrompt(providerInput),
      estimatedCostUsd: estimate.estimatedTotalCostUsd,
      outputImage: result.imageUrlOrBase64,
      metadata: {
        estimate,
        ...result.metadata,
        maxImages: 1,
      },
    });

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
        persistence,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider test failed.";
    const persistence = lastProviderInput
      ? await persistProviderTestRun({
          provider: requestedProvider,
          model: null,
          status: "error",
          selectedReferenceLook: lastProviderInput.selectedReferenceLook,
          promptVersion: normalizeProviderTestPromptVersion(lastProviderInput.promptVersion),
          promptUsed: buildProviderTestImagePrompt(lastProviderInput),
          estimatedCostUsd: lastEstimateUsd,
          errorMessage: message,
          metadata: {
            provider: requestedProvider,
            imageCount: 1,
            status: "error",
          },
        })
      : null;
    return jsonResponse(
      {
        status: "error",
        provider: requestedProvider,
        estimatedCostUsd: lastEstimateUsd,
        imageUrlOrBase64: null,
        message,
        metadata: {
          provider: requestedProvider,
          imageCount: 1,
          status: "error",
          persistence,
        },
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

async function persistRequestRun(
  input: ProviderTestRequest,
  status: ProviderTestRunStatus,
  options: {
    estimatedCostUsd?: number;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const providerInput: OneImageProviderInput = {
    provider: input.provider,
    selectedReferenceLook: input.selectedReferenceLook,
    referenceImage: input.image ?? null,
    analysisSummary: input.analysisSummary,
    resemblanceMode: input.resemblanceMode,
    promptVersion: input.promptVersion,
    explicitConfirm: input.explicitConfirm,
  };

  return persistProviderTestRun({
    provider: input.provider,
    status,
    selectedReferenceLook: input.selectedReferenceLook,
    promptVersion: input.promptVersion,
    promptUsed: buildProviderTestImagePrompt(providerInput),
    estimatedCostUsd: options.estimatedCostUsd ?? 0,
    errorMessage: options.errorMessage ?? null,
    metadata: {
      ...(options.metadata ?? {}),
      imageCount: 1,
    },
  });
}

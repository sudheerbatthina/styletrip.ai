import {
  type AiProviderId,
  getMaxEstimatedCostPerBoardUsd,
  getMaxRealImagesPerBoard,
  isPaidImageGenerationEnabled,
} from "@/lib/ai/provider-router";
import { pricingConfig } from "@/lib/cost/pricing-config";

export type CostEstimate =
  | {
      status: "free";
      provider: AiProviderId;
      estimatedUsd: 0;
      message: string;
    }
  | {
      status: "blocked";
      provider: AiProviderId;
      estimatedUsd: number;
      message: string;
    }
  | {
      status: "estimated";
      provider: AiProviderId;
      estimatedUsd: number;
      message: string;
    };

export function estimateBoardGenerationCost({
  provider,
  imageCount,
  mockMode,
}: {
  provider: AiProviderId;
  imageCount: number;
  mockMode: boolean;
}): CostEstimate {
  if (mockMode || provider === "mock") {
    return {
      status: "free",
      provider: "mock",
      estimatedUsd: 0,
      message: "Mock mode: $0 estimated cost.",
    };
  }

  const estimatedUsd = roundUsd(
    imageCount * (pricingConfig[provider]?.estimatedImageUsd ?? 0),
  );

  if (!isPaidImageGenerationEnabled()) {
    return {
      status: "blocked",
      provider,
      estimatedUsd,
      message: "Paid generation disabled.",
    };
  }

  const maxImages = getMaxRealImagesPerBoard();
  if (imageCount > maxImages) {
    return {
      status: "blocked",
      provider,
      estimatedUsd,
      message: `Real generation is limited to ${maxImages} images per board.`,
    };
  }

  const maxCost = getMaxEstimatedCostPerBoardUsd();
  if (estimatedUsd > maxCost) {
    return {
      status: "blocked",
      provider,
      estimatedUsd,
      message: `Estimated cost $${estimatedUsd.toFixed(2)} exceeds the board limit of $${maxCost.toFixed(2)}.`,
    };
  }

  return {
    status: "estimated",
    provider,
    estimatedUsd,
    message: `Estimated cost: $${estimatedUsd.toFixed(2)} before generation.`,
  };
}

function roundUsd(value: number) {
  return Math.round(value * 100) / 100;
}
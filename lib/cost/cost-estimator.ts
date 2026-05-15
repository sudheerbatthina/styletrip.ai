import {
  getImageProviderId,
  getMaxEstimatedCostPerBoardUsd,
  getMaxRealImagesPerBoard,
  getTextProviderId,
  isPaidImageGenerationEnabled,
  isMockMode,
  type AiProviderId,
} from "@/lib/ai/provider-router";
import { pricingConfig } from "@/lib/cost/pricing-config";

export type CostEstimateMode = "mock" | "blocked" | "estimate";

export type CostEstimate = {
  mode: CostEstimateMode;
  provider: string;
  imageProvider: AiProviderId;
  textProvider: AiProviderId;
  numberOfImages: number;
  estimatedTextCostUsd: number;
  estimatedImageCostUsd: number;
  estimatedTotalCostUsd: number;
  maxAllowedCostUsd: number;
  isAllowed: boolean;
  reason: string;
};

export function estimateBoardGenerationCost({
  imageCount,
  imageProvider = getImageProviderId(),
  textProvider = getTextProviderId(),
  mockMode = isMockMode(),
}: {
  imageCount: number;
  imageProvider?: AiProviderId;
  textProvider?: AiProviderId;
  mockMode?: boolean;
}): CostEstimate {
  const numberOfImages = Math.max(0, Math.floor(imageCount));
  const maxAllowedCostUsd = getMaxEstimatedCostPerBoardUsd();

  if (mockMode || imageProvider === "mock") {
    return {
      mode: "mock",
      provider: "mock",
      imageProvider: "mock",
      textProvider: "mock",
      numberOfImages,
      estimatedTextCostUsd: 0,
      estimatedImageCostUsd: 0,
      estimatedTotalCostUsd: 0,
      maxAllowedCostUsd,
      isAllowed: true,
      reason: "Mock mode: $0. No paid APIs will be called.",
    };
  }

  const estimatedTextCostUsd = roundUsd(
    textProvider === "mock" ? 0 : pricingConfig[textProvider]?.estimatedTextUsd ?? 0,
  );
  const estimatedImageCostUsd = roundUsd(
    numberOfImages * (pricingConfig[imageProvider]?.estimatedImageUsd ?? 0),
  );
  const estimatedTotalCostUsd = roundUsd(estimatedTextCostUsd + estimatedImageCostUsd);

  if (!isPaidImageGenerationEnabled()) {
    return {
      mode: "blocked",
      provider: imageProvider,
      imageProvider,
      textProvider,
      numberOfImages,
      estimatedTextCostUsd,
      estimatedImageCostUsd,
      estimatedTotalCostUsd,
      maxAllowedCostUsd,
      isAllowed: false,
      reason: "Paid generation disabled. Set ENABLE_PAID_IMAGE_GENERATION=true only when you are ready to test real providers.",
    };
  }

  const maxImages = getMaxRealImagesPerBoard();
  if (numberOfImages > maxImages) {
    return {
      mode: "blocked",
      provider: imageProvider,
      imageProvider,
      textProvider,
      numberOfImages,
      estimatedTextCostUsd,
      estimatedImageCostUsd,
      estimatedTotalCostUsd,
      maxAllowedCostUsd,
      isAllowed: false,
      reason: `Real generation is limited to ${maxImages} images per board.`,
    };
  }

  if (estimatedTotalCostUsd > maxAllowedCostUsd) {
    return {
      mode: "blocked",
      provider: imageProvider,
      imageProvider,
      textProvider,
      numberOfImages,
      estimatedTextCostUsd,
      estimatedImageCostUsd,
      estimatedTotalCostUsd,
      maxAllowedCostUsd,
      isAllowed: false,
      reason: `Estimated cost $${estimatedTotalCostUsd.toFixed(2)} exceeds the board limit of $${maxAllowedCostUsd.toFixed(2)}.`,
    };
  }

  return {
    mode: "estimate",
    provider: imageProvider,
    imageProvider,
    textProvider,
    numberOfImages,
    estimatedTextCostUsd,
    estimatedImageCostUsd,
    estimatedTotalCostUsd,
    maxAllowedCostUsd,
    isAllowed: true,
    reason: `Estimated cost: $${estimatedTotalCostUsd.toFixed(2)} before generation. Confirmation is required before real generation.`,
  };
}

function roundUsd(value: number) {
  return Math.round(value * 100) / 100;
}

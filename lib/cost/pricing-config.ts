import type { AiProviderId } from "@/lib/ai/provider-router";

export type ProviderPricing = {
  estimatedImageUsd: number;
  estimatedTextUsd: number;
};

function readUsdEnv(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

const textEstimateUsd = readUsdEnv("TEXT_EST_COST_PER_REQUEST_USD", 0.005);

export const pricingConfig: Record<AiProviderId, ProviderPricing> = {
  mock: { estimatedImageUsd: 0, estimatedTextUsd: 0 },
  openai: {
    estimatedImageUsd: readUsdEnv("OPENAI_EST_IMAGE_COST_PER_IMAGE_USD", 0.04),
    estimatedTextUsd: textEstimateUsd,
  },
  gemini: {
    estimatedImageUsd: readUsdEnv("GEMINI_EST_IMAGE_COST_PER_IMAGE_USD", 0.04),
    estimatedTextUsd: textEstimateUsd,
  },
  fal: {
    estimatedImageUsd: readUsdEnv("FAL_EST_IMAGE_COST_PER_IMAGE_USD", 0.01),
    estimatedTextUsd: textEstimateUsd,
  },
};

import type { AiProviderId } from "@/lib/ai/provider-router";

export type ProviderPricing = {
  estimatedImageUsd: number;
};

export const pricingConfig: Record<AiProviderId, ProviderPricing> = {
  mock: { estimatedImageUsd: 0 },
  openai: { estimatedImageUsd: 0.05 },
  gemini: { estimatedImageUsd: 0.05 },
  fal: { estimatedImageUsd: 0.08 },
};
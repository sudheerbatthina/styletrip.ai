import {
  getMissingProviderKey,
  isPaidImageGenerationEnabled,
} from "@/lib/ai/provider-router";
import type {
  OneImageProviderInput,
  OneImageProviderResult,
} from "@/lib/ai/providers/types";

export function getFalProvider() {
  return {
    id: "fal" as const,
    generateOneTestImage: generateFalProviderTestImage,
  };
}

export async function generateFalProviderTestImage(
  _input: OneImageProviderInput,
): Promise<OneImageProviderResult> {
  if (!isPaidImageGenerationEnabled()) {
    throw new Error("fal test generation is blocked because ENABLE_PAID_IMAGE_GENERATION is false.");
  }

  const missingKey = getMissingProviderKey("fal");
  if (missingKey) {
    throw new Error(`${missingKey} is required before fal test generation can run.`);
  }

  // TODO: Wire a single-image fal test call here after selecting the exact model/API
  // and logging/billing review. No fal API call is made by this placeholder.
  throw new Error("fal one-image provider test is not implemented yet. No API call was made.");
}

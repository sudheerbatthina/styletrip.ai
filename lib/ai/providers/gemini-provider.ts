import {
  getMissingProviderKey,
  isPaidImageGenerationEnabled,
} from "@/lib/ai/provider-router";
import type {
  OneImageProviderInput,
  OneImageProviderResult,
} from "@/lib/ai/providers/types";

export function getGeminiProvider() {
  return {
    id: "gemini" as const,
    generateOneTestImage: generateGeminiProviderTestImage,
  };
}

export async function generateGeminiProviderTestImage(
  _input: OneImageProviderInput,
): Promise<OneImageProviderResult> {
  if (!isPaidImageGenerationEnabled()) {
    throw new Error("Gemini test generation is blocked because ENABLE_PAID_IMAGE_GENERATION is false.");
  }

  const missingKey = getMissingProviderKey("gemini");
  if (missingKey) {
    throw new Error(`${missingKey} is required before Gemini test generation can run.`);
  }

  // TODO: Wire a single-image Gemini test call here after selecting the exact SDK/API
  // and logging/billing review. No Gemini API call is made by this placeholder.
  throw new Error("Gemini one-image provider test is not implemented yet. No API call was made.");
}

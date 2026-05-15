import {
  getMissingProviderKey,
  isPaidImageGenerationEnabled,
} from "@/lib/ai/provider-router";
import type {
  OneImageProviderInput,
  OneImageProviderResult,
} from "@/lib/ai/providers/types";

export function getOpenAiProvider() {
  return {
    id: "openai" as const,
    generateOneTestImage: generateOpenAiProviderTestImage,
  };
}

export async function generateOpenAiProviderTestImage(
  _input: OneImageProviderInput,
): Promise<OneImageProviderResult> {
  if (!isPaidImageGenerationEnabled()) {
    throw new Error("OpenAI test generation is blocked because ENABLE_PAID_IMAGE_GENERATION is false.");
  }

  const missingKey = getMissingProviderKey("openai");
  if (missingKey) {
    throw new Error(`${missingKey} is required before OpenAI test generation can run.`);
  }

  // TODO: Wire a single-image OpenAI test call here after selecting the exact SDK/API
  // and logging/billing review. No OpenAI API call is made by this placeholder.
  throw new Error("OpenAI one-image provider test is not implemented yet. No API call was made.");
}

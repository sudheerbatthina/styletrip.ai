import type { AiProviderId } from "@/lib/ai/provider-router";
import { buildMockOutfitImage } from "@/lib/mock-data";
import {
  buildProviderTestImagePrompt,
  normalizeProviderTestPromptVersion,
  summarizeProviderTestPrompt,
} from "@/lib/prompts/provider-test-image-prompt";
import type {
  OneImageProviderInput,
  OneImageProviderResult,
} from "@/lib/ai/providers/types";

export type MockProvider = {
  id: AiProviderId;
  kind: "mock";
};

export const mockProvider: MockProvider = {
  id: "mock",
  kind: "mock",
};

export async function generateMockProviderTestImage(
  input: OneImageProviderInput,
): Promise<OneImageProviderResult> {
  const promptVersion = normalizeProviderTestPromptVersion(input.promptVersion);
  return {
    imageUrlOrBase64: buildMockOutfitImage(input.selectedReferenceLook.title, 0),
    metadata: {
      provider: "mock",
      mode: "mock",
      promptVersion,
      promptUsed: buildProviderTestImagePrompt({ ...input, promptVersion }),
      promptSummary: summarizeProviderTestPrompt(input),
      referenceImageUsed: Boolean(input.referenceImage),
      warnings: ["Mock provider test generated a local demo image. No paid APIs were called."],
    },
  };
}

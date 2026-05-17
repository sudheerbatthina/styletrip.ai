import type { AiProviderId } from "@/lib/ai/provider-router";
import type { ProviderTestPromptVersion } from "@/lib/prompts/provider-test-image-prompt";
import type { ImageInput, ReferenceLook } from "@/lib/schemas";

export type OneImageProviderInput = {
  provider: AiProviderId;
  selectedReferenceLook: ReferenceLook;
  referenceImage?: ImageInput | null;
  analysisSummary?: string;
  resemblanceMode?: string;
  promptVersion?: ProviderTestPromptVersion;
  explicitConfirm: boolean;
};

export type OneImageProviderResult = {
  imageUrlOrBase64: string;
  metadata: {
    provider: AiProviderId;
    mode: "mock" | "real";
    model?: string;
    promptVersion?: ProviderTestPromptVersion;
    promptUsed?: string;
    promptSummary?: string;
    referenceImageUsed?: boolean;
    warnings?: string[];
  };
};

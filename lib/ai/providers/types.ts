import type { AiProviderId } from "@/lib/ai/provider-router";
import type { ImageInput, ReferenceLook } from "@/lib/schemas";

export type OneImageProviderInput = {
  provider: AiProviderId;
  selectedReferenceLook: ReferenceLook;
  referenceImage?: ImageInput | null;
  analysisSummary?: string;
  resemblanceMode?: string;
  explicitConfirm: boolean;
};

export type OneImageProviderResult = {
  imageUrlOrBase64: string;
  metadata: {
    provider: AiProviderId;
    mode: "mock" | "real";
    promptUsed?: string;
    warnings?: string[];
  };
};

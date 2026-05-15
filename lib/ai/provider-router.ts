export type AiProviderId = "mock" | "openai" | "gemini" | "fal";

export type AiProviderStatus = {
  id: AiProviderId;
  enabled: boolean;
  reason?: string;
};

function normalizeProvider(value: string | undefined, fallback: AiProviderId): AiProviderId {
  if (value === "openai" || value === "gemini" || value === "fal" || value === "mock") {
    return value;
  }
  return fallback;
}

export function isMockMode() {
  return process.env.NEXT_PUBLIC_MOCK_MODE === "true";
}

export function isPaidImageGenerationEnabled() {
  return process.env.ENABLE_PAID_IMAGE_GENERATION === "true";
}

export function getTextProviderId(): AiProviderId {
  if (isMockMode()) {
    return "mock";
  }
  return normalizeProvider(process.env.AI_TEXT_PROVIDER, "mock");
}

export function getImageProviderId(): AiProviderId {
  if (isMockMode()) {
    return "mock";
  }
  return normalizeProvider(process.env.AI_IMAGE_PROVIDER, "mock");
}

export function getImageFallbackProviderId(): AiProviderId | null {
  if (!process.env.AI_IMAGE_FALLBACK_PROVIDER) {
    return null;
  }
  return normalizeProvider(process.env.AI_IMAGE_FALLBACK_PROVIDER, "mock");
}

export function getMaxRealImagesPerBoard() {
  const value = Number(process.env.MAX_REAL_IMAGES_PER_BOARD ?? 4);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 4;
}

export function getMaxEstimatedCostPerBoardUsd() {
  const value = Number(process.env.MAX_ESTIMATED_COST_PER_BOARD_USD ?? 0.25);
  return Number.isFinite(value) && value >= 0 ? value : 0.25;
}

export function getProviderStatus(providerId: AiProviderId): AiProviderStatus {
  if (providerId === "mock") {
    return { id: "mock", enabled: true };
  }

  if (!isPaidImageGenerationEnabled()) {
    return {
      id: providerId,
      enabled: false,
      reason: "Paid image generation is disabled.",
    };
  }

  const missingKey = getMissingProviderKey(providerId);
  if (missingKey) {
    return {
      id: providerId,
      enabled: false,
      reason: `${missingKey} is not configured for ${providerId}.`,
    };
  }

  return {
    id: providerId,
    enabled: false,
    reason: `${providerId} provider is not implemented yet.`,
  };
}

function getMissingProviderKey(providerId: AiProviderId) {
  if (providerId === "openai" && !process.env.OPENAI_API_KEY) {
    return "OPENAI_API_KEY";
  }
  if (providerId === "gemini" && !process.env.GEMINI_API_KEY) {
    return "GEMINI_API_KEY";
  }
  if (providerId === "fal" && !process.env.FAL_KEY) {
    return "FAL_KEY";
  }
  return null;
}
export type AiProviderId = "mock" | "openai" | "gemini" | "fal";

export type AiProviderStatus = {
  id: AiProviderId;
  enabled: boolean;
  reason?: string;
  missingKey?: boolean;
  missingKeyName?: string;
};

export type ReferenceProviderId = "curated" | "pexels" | "unsplash";

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

export function getMaxRealTestImages() {
  const value = Number(process.env.MAX_REAL_TEST_IMAGES ?? 1);
  return Number.isFinite(value) && value > 0 ? Math.min(1, Math.floor(value)) : 1;
}

export function isProviderTestLabVisible() {
  return process.env.NODE_ENV === "development" || process.env.SHOW_PROVIDER_TEST_LAB === "true";
}

export function isProviderTestLabExplicitlyEnabled() {
  return process.env.SHOW_PROVIDER_TEST_LAB === "true";
}

export function getReferenceProviderId(): ReferenceProviderId {
  const provider = process.env.REFERENCE_IMAGE_PROVIDER;
  if (provider === "pexels" || provider === "unsplash" || provider === "curated") {
    return provider;
  }
  return "curated";
}

export function getReferenceProviderMaxResults() {
  const value = Number(process.env.REFERENCE_PROVIDER_MAX_RESULTS ?? 24);
  return Number.isFinite(value) ? Math.max(4, Math.min(24, Math.floor(value))) : 24;
}

export function isReferenceProviderCacheEnabled() {
  return process.env.REFERENCE_PROVIDER_CACHE_ENABLED !== "false";
}

export function getReferenceProviderTimeoutMs() {
  const value = Number(process.env.REFERENCE_PROVIDER_TIMEOUT_MS ?? 8000);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 8000;
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
      missingKey: true,
      missingKeyName: missingKey,
      reason: `${missingKey} is not configured for ${providerId}.`,
    };
  }

  if (providerId === "openai") {
    return {
      id: providerId,
      enabled: true,
      reason: "OpenAI one-image test provider is available only through the developer test lab.",
    };
  }

  return {
    id: providerId,
    enabled: false,
    reason: `${providerId} provider is not implemented yet.`,
  };
}

export function getMissingProviderKey(providerId: AiProviderId) {
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

export function getReferenceProviderStatus(providerId = getReferenceProviderId()) {
  if (providerId === "curated") {
    return {
      id: providerId,
      enabled: true,
      missingKey: false,
    };
  }

  const missingKey =
    providerId === "pexels" && !process.env.PEXELS_API_KEY
      ? "PEXELS_API_KEY"
      : providerId === "unsplash" && !process.env.UNSPLASH_ACCESS_KEY
        ? "UNSPLASH_ACCESS_KEY"
        : null;

  return {
    id: providerId,
    enabled: !missingKey,
    missingKey: Boolean(missingKey),
    missingKeyName: missingKey ?? undefined,
    reason: missingKey
      ? `${missingKey} is not configured for ${providerId}. Curated fallback will be used.`
      : undefined,
  };
}

export function getSafeProviderStatus() {
  const textProvider = getTextProviderId();
  const imageProvider = getImageProviderId();
  const fallbackImageProvider = getImageFallbackProviderId();
  const referenceProvider = getReferenceProviderId();

  return {
    mockMode: isMockMode(),
    paidGenerationEnabled: isPaidImageGenerationEnabled(),
    referenceProvider,
    referenceProviderCacheEnabled: isReferenceProviderCacheEnabled(),
    referenceProviderMaxResults: getReferenceProviderMaxResults(),
    referenceProviderTimeoutMs: getReferenceProviderTimeoutMs(),
    referenceFallbackBehavior: "External reference providers fall back to curated local references on missing keys, failures, timeouts, or too few results.",
    textProvider,
    imageProvider,
    fallbackImageProvider,
    maxRealImagesPerBoard: getMaxRealImagesPerBoard(),
    maxRealTestImages: getMaxRealTestImages(),
    maxEstimatedCostPerBoardUsd: getMaxEstimatedCostPerBoardUsd(),
    providerTestLabVisible: isProviderTestLabVisible(),
    providerStatus: {
      text: getProviderStatus(textProvider),
      image: getProviderStatus(imageProvider),
      fallbackImage: fallbackImageProvider
        ? getProviderStatus(fallbackImageProvider)
        : null,
      reference: getReferenceProviderStatus(referenceProvider),
    },
    missingKeys: {
      openai: Boolean(getMissingProviderKey("openai")),
      gemini: Boolean(getMissingProviderKey("gemini")),
      fal: Boolean(getMissingProviderKey("fal")),
      pexels: !process.env.PEXELS_API_KEY,
      unsplash: !process.env.UNSPLASH_ACCESS_KEY,
    },
  };
}

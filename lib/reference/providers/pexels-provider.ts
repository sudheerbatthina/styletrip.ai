import {
  createReferenceCacheKey,
  createReferencePreferencesHash,
  getReferenceCache,
  setReferenceCache,
} from "@/lib/reference/reference-cache";
import { buildReferenceQueries } from "@/lib/reference/reference-query-builder";
import {
  createBaseReferenceLook,
  mockStyleCards,
  type ReferenceProviderInput,
} from "@/lib/reference/providers/curated-provider";
import type { ReferenceLook } from "@/lib/schemas";

type PexelsPhoto = {
  id?: number;
  url?: string;
  photographer?: string;
  photographer_url?: string;
  src?: {
    large2x?: string;
    large?: string;
    portrait?: string;
    original?: string;
  };
  alt?: string;
};

type PexelsResponse = {
  photos?: PexelsPhoto[];
};

export function getPexelsStatus() {
  if (process.env.REFERENCE_IMAGE_PROVIDER !== "pexels") {
    return { enabled: false, reason: "REFERENCE_IMAGE_PROVIDER is not set to pexels." };
  }
  if (!process.env.PEXELS_API_KEY) {
    return { enabled: false, reason: "PEXELS_API_KEY is not configured." };
  }
  return { enabled: true };
}

export async function getPexelsReferenceLooks(input: ReferenceProviderInput): Promise<ReferenceLook[]> {
  const status = getPexelsStatus();
  if (!status.enabled) {
    return [];
  }

  const preferencesHash = createReferencePreferencesHash({
    target: input.target,
    tripLocation: input.preferences.tripLocation,
    occasions: input.preferences.occasionTypes,
    fit: input.preferences.preferredFit,
    favoriteColors: input.preferences.favoriteColors,
    dislikedStyles: input.preferences.dislikedStyles,
    genderStyleDirection: input.preferences.genderStyleDirection,
    colors: input.analysis.recommendedColorPalette.slice(0, 5),
    silhouettes: input.analysis.recommendedSilhouettes.slice(0, 4),
    currentStyleProfile: input.analysis.visibleStyleProfile.currentOutfitNotes,
    fitAdvice: input.analysis.visibleStyleProfile.fitAdvice.slice(0, 2),
  });
  const cacheKey = createReferenceCacheKey({
    provider: "pexels",
    query: "batch",
    preferencesHash,
    target: input.target,
  });
  const cached = getReferenceCache<ReferenceLook[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const looks: ReferenceLook[] = [];
  const seenPhotoUrls = new Set<string>();
  for (let index = 0; index < Math.min(input.target, mockStyleCards.length); index += 1) {
    const style = mockStyleCards[index];
    const occasion = input.preferences.occasionTypes[index % Math.max(input.preferences.occasionTypes.length, 1)] ?? style.bestFor;
    const queries = buildReferenceQueries({
      analysis: input.analysis,
      preferences: input.preferences,
      style,
      occasion,
    });
    const photo = await fetchFirstPexelsPhoto(queries, preferencesHash, seenPhotoUrls);
    if (!photo?.src) {
      continue;
    }
    const imageUrl = photo.src.portrait ?? photo.src.large2x ?? photo.src.large ?? photo.src.original ?? "";
    if (!imageUrl) {
      continue;
    }
    seenPhotoUrls.add(imageUrl);

    looks.push(
      createBaseReferenceLook({
        style,
        index,
        preferences: input.preferences,
        imageUrl,
        source: "stock",
        sourceUrl: photo.url ?? null,
        sourceName: "Pexels",
        photographer: photo.photographer ?? "",
        photographerUrl: photo.photographer_url ?? null,
        attributionText: photo.photographer ? `Photo by ${photo.photographer} on Pexels` : "Photo from Pexels",
      }),
    );
  }

  setReferenceCache(cacheKey, looks);
  return looks;
}

async function fetchFirstPexelsPhoto(
  queries: string[],
  preferencesHash: string,
  seenPhotoUrls: Set<string>,
) {
  for (const query of queries) {
    try {
      const photos = await fetchPexelsPhotos(query, preferencesHash);
      const match = photos.find((photo) => {
        const imageUrl = photo.src?.portrait ?? photo.src?.large2x ?? photo.src?.large ?? photo.src?.original ?? "";
        return imageUrl && !seenPhotoUrls.has(imageUrl);
      });
      if (match) {
        return match;
      }
    } catch (error) {
      console.warn("Pexels query failed; trying fallback query.", error);
    }
  }
  return null;
}

async function fetchPexelsPhotos(query: string, preferencesHash: string) {
  const cacheKey = createReferenceCacheKey({
    provider: "pexels",
    query,
    preferencesHash,
    target: 6,
  });
  const cached = getReferenceCache<PexelsPhoto[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "portrait");
  url.searchParams.set("per_page", "6");

  const response = await fetchWithTimeout(url.toString(), {
    headers: {
      Authorization: process.env.PEXELS_API_KEY ?? "",
    },
  });

  if (!response.ok) {
    throw new Error(`Pexels request failed with ${response.status}.`);
  }

  const data = (await response.json()) as PexelsResponse;
  const photos = data.photos ?? [];
  setReferenceCache(cacheKey, photos);
  return photos;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 4500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getReferenceProviderTimeoutMs(timeoutMs));
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function getReferenceProviderTimeoutMs(fallback: number) {
  const value = Number(process.env.REFERENCE_PROVIDER_TIMEOUT_MS ?? 8000);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

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

type UnsplashPhoto = {
  id?: string;
  alt_description?: string | null;
  links?: { html?: string };
  urls?: { regular?: string; full?: string; raw?: string };
  user?: { name?: string; links?: { html?: string } };
};

type UnsplashResponse = {
  results?: UnsplashPhoto[];
};

export function getUnsplashStatus() {
  if (process.env.REFERENCE_IMAGE_PROVIDER !== "unsplash") {
    return { enabled: false, reason: "REFERENCE_IMAGE_PROVIDER is not set to unsplash." };
  }
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    return { enabled: false, reason: "UNSPLASH_ACCESS_KEY is not configured." };
  }
  return { enabled: true };
}

export async function getUnsplashReferenceLooks(input: ReferenceProviderInput): Promise<ReferenceLook[]> {
  const status = getUnsplashStatus();
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
  });
  const cacheKey = createReferenceCacheKey({
    provider: "unsplash",
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
    const photo = await fetchFirstUnsplashPhoto(queries, preferencesHash, seenPhotoUrls);
    if (!photo?.urls) {
      continue;
    }
    const imageUrl = photo.urls.regular ?? photo.urls.full ?? photo.urls.raw ?? "";
    if (!imageUrl) {
      continue;
    }
    seenPhotoUrls.add(imageUrl);

    const photographer = photo.user?.name ?? "";
    looks.push(
      createBaseReferenceLook({
        style,
        index,
        preferences: input.preferences,
        imageUrl,
        source: "stock",
        sourceUrl: photo.links?.html ?? null,
        sourceName: "Unsplash",
        photographer,
        photographerUrl: photo.user?.links?.html ?? null,
        attributionText: photographer ? `Photo by ${photographer} on Unsplash` : "Photo from Unsplash",
      }),
    );
  }

  setReferenceCache(cacheKey, looks);
  return looks;
}

async function fetchFirstUnsplashPhoto(
  queries: string[],
  preferencesHash: string,
  seenPhotoUrls: Set<string>,
) {
  for (const query of queries) {
    try {
      const photos = await fetchUnsplashPhotos(query, preferencesHash);
      const match = photos.find((photo) => {
        const imageUrl = photo.urls?.regular ?? photo.urls?.full ?? photo.urls?.raw ?? "";
        return imageUrl && !seenPhotoUrls.has(imageUrl);
      });
      if (match) {
        return match;
      }
    } catch (error) {
      console.warn("Unsplash query failed; trying fallback query.", error);
    }
  }
  return null;
}

async function fetchUnsplashPhotos(query: string, preferencesHash: string) {
  const cacheKey = createReferenceCacheKey({
    provider: "unsplash",
    query,
    preferencesHash,
    target: 6,
  });
  const cached = getReferenceCache<UnsplashPhoto[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "portrait");
  url.searchParams.set("per_page", "6");
  url.searchParams.set("content_filter", "high");

  const response = await fetchWithTimeout(url.toString(), {
    headers: {
      Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY ?? ""}`,
      "Accept-Version": "v1",
    },
  });

  if (!response.ok) {
    throw new Error(`Unsplash request failed with ${response.status}.`);
  }

  const data = (await response.json()) as UnsplashResponse;
  const photos = data.results ?? [];
  setReferenceCache(cacheKey, photos);
  return photos;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 4500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

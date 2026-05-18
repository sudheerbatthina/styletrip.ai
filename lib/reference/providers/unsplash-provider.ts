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
    silhouettes: input.analysis.recommendedSilhouettes.slice(0, 4),
    currentStyleProfile: input.analysis.visibleStyleProfile.currentOutfitNotes,
    fitAdvice: input.analysis.visibleStyleProfile.fitAdvice.slice(0, 2),
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
  for (let index = 0; index < input.target; index += 1) {
    const style = mockStyleCards[index % mockStyleCards.length];
    const styleIdea = input.styleIdeas?.[index];
    const queryStyle = styleIdea ?? style;
    const occasion = styleIdea?.occasion
      ?? input.preferences.occasionTypes[index % Math.max(input.preferences.occasionTypes.length, 1)]
      ?? style.bestFor;
    const queries = buildReferenceQueries({
      analysis: input.analysis,
      preferences: input.preferences,
      style: queryStyle,
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
    const baseLook = createBaseReferenceLook({
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
    });

    looks.push(styleIdea ? applyStyleIdeaToStockLook(baseLook, styleIdea, index) : baseLook);
  }

  setReferenceCache(cacheKey, looks);
  return looks;
}

function applyStyleIdeaToStockLook(look: ReferenceLook, styleIdea: NonNullable<ReferenceProviderInput["styleIdeas"]>[number], index: number): ReferenceLook {
  return {
    ...look,
    id: `unsplash-${index + 1}-${styleIdea.id}`,
    title: styleIdea.title,
    occasion: styleIdea.occasion,
    fit: styleIdea.fit,
    colorMood: styleIdea.palette.slice(0, 3).join(" / "),
    items: styleIdea.keyItems.slice(0, 4),
    whyItFits: styleIdea.whyItWorks,
    promptHint: styleIdea.generationBrief,
    whyThisMatches: [styleIdea.whyItWorks],
    matchTags: [styleIdea.vibe, styleIdea.fit].filter(Boolean).slice(0, 2),
  };
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

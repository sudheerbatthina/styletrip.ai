import { getReferenceCache, setReferenceCache } from "@/lib/reference/reference-cache";
import { buildReferenceQuery } from "@/lib/reference/reference-query-builder";
import {
  createBaseReferenceLook,
  mockStyleCards,
  type ReferenceProviderInput,
} from "@/lib/reference/providers/curated-provider";
import type { ReferenceLook } from "@/lib/schemas";

type PexelsPhoto = {
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

  const cacheKey = `pexels:${JSON.stringify({
    target: input.target,
    tripLocation: input.preferences.tripLocation,
    occasions: input.preferences.occasionTypes,
    fit: input.preferences.preferredFit,
    colors: input.analysis.recommendedColorPalette.slice(0, 4),
  })}`;
  const cached = getReferenceCache<ReferenceLook[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const looks: ReferenceLook[] = [];
  for (let index = 0; index < Math.min(input.target, mockStyleCards.length); index += 1) {
    const style = mockStyleCards[index];
    const occasion = input.preferences.occasionTypes[index % Math.max(input.preferences.occasionTypes.length, 1)] ?? style.bestFor;
    const query = buildReferenceQuery({
      analysis: input.analysis,
      preferences: input.preferences,
      style,
      occasion,
    });
    const photo = await fetchPexelsPhoto(query);
    if (!photo?.src) {
      continue;
    }

    looks.push(
      createBaseReferenceLook({
        style,
        index,
        preferences: input.preferences,
        imageUrl: photo.src.portrait ?? photo.src.large2x ?? photo.src.large ?? photo.src.original ?? "",
        source: "pexels",
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

async function fetchPexelsPhoto(query: string) {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "portrait");
  url.searchParams.set("per_page", "1");

  const response = await fetchWithTimeout(url.toString(), {
    headers: {
      Authorization: process.env.PEXELS_API_KEY ?? "",
    },
  });

  if (!response.ok) {
    throw new Error(`Pexels request failed with ${response.status}.`);
  }

  const data = (await response.json()) as PexelsResponse;
  return data.photos?.[0] ?? null;
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
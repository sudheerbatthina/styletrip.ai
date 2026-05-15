import { getReferenceCache, setReferenceCache } from "@/lib/reference/reference-cache";
import { buildReferenceQuery } from "@/lib/reference/reference-query-builder";
import {
  createBaseReferenceLook,
  mockStyleCards,
  type ReferenceProviderInput,
} from "@/lib/reference/providers/curated-provider";
import type { ReferenceLook } from "@/lib/schemas";

type UnsplashPhoto = {
  alt_description?: string | null;
  links?: { html?: string };
  urls?: { regular?: string; full?: string; raw?: string };
  user?: { name?: string; links?: { html?: string } };
};

type UnsplashResponse = {
  results?: UnsplashPhoto[];
};

export function getUnsplashStatus() {
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

  const cacheKey = `unsplash:${JSON.stringify({
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
    const photo = await fetchUnsplashPhoto(query);
    if (!photo?.urls) {
      continue;
    }

    const photographer = photo.user?.name ?? "";
    looks.push(
      createBaseReferenceLook({
        style,
        index,
        preferences: input.preferences,
        imageUrl: photo.urls.regular ?? photo.urls.full ?? photo.urls.raw ?? "",
        source: "unsplash",
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

async function fetchUnsplashPhoto(query: string) {
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "portrait");
  url.searchParams.set("per_page", "1");
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
  return data.results?.[0] ?? null;
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
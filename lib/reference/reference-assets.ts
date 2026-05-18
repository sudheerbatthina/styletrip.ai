import { randomUUID } from "node:crypto";
import { imageStringToUploadable } from "@/lib/storage-utils";
import type { ReferenceLook } from "@/lib/schemas";
import { storageBuckets } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

export type ReferenceAsset = {
  id: string;
  title: string;
  source: string;
  sourceName?: string | null;
  sourceUrl?: string | null;
  photographer?: string | null;
  photographerUrl?: string | null;
  attributionText?: string | null;
  imagePath?: string | null;
  imageUrl?: string | null;
  displayImageUrl?: string | null;
  genderStyle?: string | null;
  occasionTags: string[];
  styleTags: string[];
  fitTags: string[];
  colorTags: string[];
  itemTags: string[];
  seasonTags: string[];
  metadata?: Record<string, unknown> | null;
  isPublic: boolean;
  createdAt: string;
};

export type ReferenceAssetInput = {
  title: string;
  source?: string;
  sourceName?: string | null;
  sourceUrl?: string | null;
  photographer?: string | null;
  photographerUrl?: string | null;
  attributionText?: string | null;
  imageDataUrl?: string | null;
  imageUrl?: string | null;
  genderStyle?: string | null;
  occasionTags?: string[];
  styleTags?: string[];
  fitTags?: string[];
  colorTags?: string[];
  itemTags?: string[];
  seasonTags?: string[];
  metadata?: Record<string, unknown>;
  isPublic?: boolean;
};

type ReferenceAssetRow = {
  id: string;
  title: string;
  source: string | null;
  source_name: string | null;
  source_url: string | null;
  photographer: string | null;
  photographer_url: string | null;
  attribution_text: string | null;
  image_path: string | null;
  image_url: string | null;
  gender_style: string | null;
  occasion_tags: unknown;
  style_tags: unknown;
  fit_tags: unknown;
  color_tags: unknown;
  item_tags: unknown;
  season_tags: unknown;
  metadata_json: Record<string, unknown> | null;
  is_public: boolean | null;
  created_at: string;
};

export async function getReferenceAssets(limit = 60) {
  const { supabase, user } = await getCurrentUser();
  if (!supabase) {
    return { assets: [] as ReferenceAsset[], available: false, reason: "Supabase is not configured." };
  }

  let query = supabase
    .from("reference_assets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (user) {
    query = query.or(`user_id.eq.${user.id},is_public.eq.true`);
  } else {
    query = query.eq("is_public", true);
  }

  const result = await query;
  if (result.error) {
    return {
      assets: [] as ReferenceAsset[],
      available: false,
      reason: isMissingReferenceAssetTable(result.error)
        ? "reference_assets migration has not been applied yet."
        : result.error.message,
    };
  }

  const assets = await Promise.all(((result.data ?? []) as ReferenceAssetRow[]).map(rowToAsset));
  return { assets, available: true, reason: null };
}

export async function createReferenceAsset(input: ReferenceAssetInput) {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return { saved: false, asset: null, reason: "Sign in to save reference assets." };
  }

  const id = randomUUID();
  let imagePath: string | null = null;
  let imageUrl = input.imageUrl ?? null;
  const metadata = { ...(input.metadata ?? {}) };

  if (input.imageDataUrl) {
    try {
      const uploadable = await imageStringToUploadable(input.imageDataUrl);
      imagePath = `${user.id}/${id}.${uploadable.extension}`;
      const storage = await supabase.storage
        .from(storageBuckets.referenceAssets)
        .upload(imagePath, uploadable.buffer, {
          contentType: uploadable.mimeType,
          upsert: true,
        });
      if (storage.error) {
        metadata.storageWarning = storage.error.message;
        imagePath = null;
        imageUrl = input.imageDataUrl;
      }
    } catch (error) {
      metadata.storageWarning = error instanceof Error ? error.message : "Could not upload reference asset.";
      imageUrl = input.imageDataUrl;
      imagePath = null;
    }
  }

  const insert = await supabase.from("reference_assets").insert({
    id,
    user_id: user.id,
    title: input.title,
    source: input.source ?? "curated",
    source_name: input.sourceName ?? null,
    source_url: input.sourceUrl ?? null,
    photographer: input.photographer ?? null,
    photographer_url: input.photographerUrl ?? null,
    attribution_text: input.attributionText ?? null,
    image_path: imagePath,
    image_url: imageUrl,
    gender_style: input.genderStyle ?? null,
    occasion_tags: input.occasionTags ?? [],
    style_tags: input.styleTags ?? [],
    fit_tags: input.fitTags ?? [],
    color_tags: input.colorTags ?? [],
    item_tags: input.itemTags ?? [],
    season_tags: input.seasonTags ?? [],
    metadata_json: metadata,
    is_public: false,
  }).select("*").single();

  if (insert.error) {
    return {
      saved: false,
      asset: null,
      reason: isMissingReferenceAssetTable(insert.error)
        ? "reference_assets migration has not been applied yet."
        : insert.error.message,
    };
  }

  return { saved: true, asset: await rowToAsset(insert.data as ReferenceAssetRow), reason: null };
}

export async function updateReferenceAsset(id: string, input: Partial<ReferenceAssetInput>) {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return { saved: false, asset: null, reason: "Sign in to update reference assets." };
  }

  const updates: Record<string, unknown> = {};
  setIfPresent(updates, "title", input.title);
  setIfPresent(updates, "source", input.source);
  setIfPresent(updates, "source_name", input.sourceName);
  setIfPresent(updates, "source_url", input.sourceUrl);
  setIfPresent(updates, "photographer", input.photographer);
  setIfPresent(updates, "photographer_url", input.photographerUrl);
  setIfPresent(updates, "attribution_text", input.attributionText);
  setIfPresent(updates, "image_url", input.imageUrl);
  setIfPresent(updates, "gender_style", input.genderStyle);
  setIfPresent(updates, "occasion_tags", input.occasionTags);
  setIfPresent(updates, "style_tags", input.styleTags);
  setIfPresent(updates, "fit_tags", input.fitTags);
  setIfPresent(updates, "color_tags", input.colorTags);
  setIfPresent(updates, "item_tags", input.itemTags);
  setIfPresent(updates, "season_tags", input.seasonTags);
  setIfPresent(updates, "metadata_json", input.metadata);

  const update = await supabase
    .from("reference_assets")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (update.error) {
    return { saved: false, asset: null, reason: update.error.message };
  }

  return { saved: true, asset: await rowToAsset(update.data as ReferenceAssetRow), reason: null };
}

export async function deleteReferenceAsset(id: string) {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return { deleted: false, reason: "Sign in to delete reference assets." };
  }

  const result = await supabase.from("reference_assets").delete().eq("id", id).eq("user_id", user.id);
  if (result.error) {
    return { deleted: false, reason: result.error.message };
  }
  return { deleted: true, reason: null };
}

export async function findReferenceAssetLooks({
  limit = 12,
  queryText,
}: {
  limit?: number;
  queryText: string;
}) {
  const result = await getReferenceAssets(80);
  if (!result.available) {
    return [] as ReferenceLook[];
  }

  const ranked = result.assets
    .map((asset) => ({ asset, score: scoreAsset(asset, queryText) }))
    .filter((item) => item.asset.displayImageUrl || item.asset.imageUrl)
    .sort((first, second) => second.score - first.score || first.asset.title.localeCompare(second.asset.title))
    .slice(0, limit);

  return ranked.map(({ asset, score }, index) => assetToReferenceLook(asset, index, score));
}

function setIfPresent(target: Record<string, unknown>, key: string, value: unknown) {
  if (value !== undefined) {
    target[key] = value;
  }
}
function assetToReferenceLook(asset: ReferenceAsset, index: number, score: number): ReferenceLook {
  const colors = asset.colorTags.length ? asset.colorTags : ["flexible palette"];
  const fit = asset.fitTags[0] ?? "relaxed";
  const occasion = asset.occasionTags[0] ?? "reference";
  const sourceName = asset.sourceName || getSourceName(asset.source);
  return {
    id: `reference-asset-${asset.id}`,
    title: asset.title,
    occasion,
    fit,
    colorMood: colors.slice(0, 3).join(" / "),
    items: asset.itemTags.length ? asset.itemTags.slice(0, 4) : asset.styleTags.slice(0, 4),
    whyItFits: "Saved reference from your library matched the current style direction.",
    referenceImageUrl: asset.displayImageUrl ?? asset.imageUrl ?? "",
    source: asset.source === "manual-chatgpt" ? "manual" : "curated",
    sourceUrl: asset.sourceUrl ?? null,
    sourceName,
    photographer: asset.photographer ?? "",
    photographerUrl: asset.photographerUrl ?? null,
    attributionText: asset.attributionText ?? sourceName,
    promptHint: `${asset.title} ${asset.styleTags.join(" ")} ${asset.itemTags.join(" ")}`,
    selected: false,
    overallMatchScore: Math.max(70, Math.min(98, 82 + score * 2)),
    bodyFitScore: 84,
    colorScore: 84,
    occasionScore: 84,
    preferenceScore: 84,
    whyThisMatches: ["Pulled from your Reference Library before external or illustration fallback."],
    matchTags: [sourceName, ...asset.styleTags, ...asset.fitTags].filter(Boolean).slice(0, 2),
  };
}

async function rowToAsset(row: ReferenceAssetRow): Promise<ReferenceAsset> {
  return {
    id: row.id,
    title: row.title,
    source: row.source ?? "curated",
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    photographer: row.photographer,
    photographerUrl: row.photographer_url,
    attributionText: row.attribution_text,
    imagePath: row.image_path,
    imageUrl: row.image_url,
    displayImageUrl: await getDisplayUrl(row.image_path, row.image_url),
    genderStyle: row.gender_style,
    occasionTags: toStringArray(row.occasion_tags),
    styleTags: toStringArray(row.style_tags),
    fitTags: toStringArray(row.fit_tags),
    colorTags: toStringArray(row.color_tags),
    itemTags: toStringArray(row.item_tags),
    seasonTags: toStringArray(row.season_tags),
    metadata: row.metadata_json,
    isPublic: Boolean(row.is_public),
    createdAt: row.created_at,
  };
}

async function getDisplayUrl(path: string | null, fallback: string | null) {
  if (!path) {
    return fallback;
  }
  const { supabase } = await getCurrentUser();
  if (!supabase) {
    return fallback;
  }
  const signed = await supabase.storage.from(storageBuckets.referenceAssets).createSignedUrl(path, 60 * 60);
  return signed.data?.signedUrl ?? fallback;
}

function scoreAsset(asset: ReferenceAsset, queryText: string) {
  const haystack = [
    asset.title,
    asset.genderStyle ?? "",
    ...asset.occasionTags,
    ...asset.styleTags,
    ...asset.fitTags,
    ...asset.colorTags,
    ...asset.itemTags,
    ...asset.seasonTags,
  ].join(" ").toLowerCase();
  return queryText.toLowerCase().split(/\s+/).filter((word) => word.length > 2 && haystack.includes(word)).length;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getSourceName(source: string) {
  if (source === "manual-chatgpt") return "Prompt Lab";
  if (source === "pexels") return "Pexels";
  if (source === "unsplash") return "Unsplash";
  return "My Library";
}

function isMissingReferenceAssetTable(error: { code?: string; message?: string }) {
  return error.code === "42P01" || error.code === "PGRST205" || /reference_assets|schema cache|does not exist/i.test(error.message ?? "");
}

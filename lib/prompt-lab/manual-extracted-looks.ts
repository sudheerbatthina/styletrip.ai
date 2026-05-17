import { randomUUID } from "node:crypto";
import type { ReferenceLook } from "@/lib/schemas";
import { storageBuckets } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

export type ManualExtractedLookInput = {
  manualResultId: string;
  boardId?: string | null;
  title: string;
  occasion?: string | null;
  fit?: string | null;
  colorMood?: string | null;
  items: string[];
  colors: string[];
  footwear?: string[];
  accessories?: string[];
  whyItWorks?: string | null;
  matchScore?: number | null;
  sourceImagePath?: string | null;
  sourceCropPath?: string | null;
  metadata?: Record<string, unknown>;
};

export type ManualExtractedLookItem = ManualExtractedLookInput & {
  id: string;
  sourceImageUrl?: string | null;
  sourceCropUrl?: string | null;
  createdAt: string;
};

type ManualExtractedLookRow = {
  id: string;
  manual_result_id: string;
  board_id: string | null;
  title: string;
  occasion: string | null;
  fit: string | null;
  color_mood: string | null;
  items: string[] | null;
  colors: string[] | null;
  footwear: string[] | null;
  accessories: string[] | null;
  why_it_works: string | null;
  match_score: number | null;
  source_image_path: string | null;
  source_crop_path: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
};

type ManualPromptResultImageRow = {
  imported_image_path: string | null;
  imported_image_url: string | null;
};

export async function getManualExtractedLooks(manualResultId: string) {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return { looks: [] as ManualExtractedLookItem[], available: false, reason: "Sign in to load extracted looks." };
  }

  const query = await supabase
    .from("manual_extracted_looks")
    .select("id, manual_result_id, board_id, title, occasion, fit, color_mood, items, colors, footwear, accessories, why_it_works, match_score, source_image_path, source_crop_path, metadata_json, created_at")
    .eq("manual_result_id", manualResultId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (query.error) {
    return {
      looks: [] as ManualExtractedLookItem[],
      available: false,
      reason: isMissingTableError(query.error)
        ? "manual_extracted_looks migration has not been applied yet."
        : query.error.message,
    };
  }

  const looks = await Promise.all(((query.data ?? []) as ManualExtractedLookRow[]).map(rowToItem));
  return { looks, available: true, reason: null };
}

export async function createManualExtractedLook(input: ManualExtractedLookInput) {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return { look: null, saved: false, reason: "No user session is available." };
  }

  const id = randomUUID();
  const sourceImagePath = input.sourceImagePath ?? await getManualResultSourcePath(input.manualResultId);
  const insert = await supabase.from("manual_extracted_looks").insert({
    id,
    user_id: user.id,
    manual_result_id: input.manualResultId,
    board_id: input.boardId ?? null,
    title: input.title,
    occasion: input.occasion ?? null,
    fit: input.fit ?? null,
    color_mood: input.colorMood ?? null,
    items: input.items,
    colors: input.colors,
    footwear: input.footwear ?? [],
    accessories: input.accessories ?? [],
    why_it_works: input.whyItWorks ?? null,
    match_score: input.matchScore ?? null,
    source_image_path: sourceImagePath,
    source_crop_path: input.sourceCropPath ?? null,
    metadata_json: input.metadata ?? {},
  });

  if (insert.error) {
    return {
      look: null,
      saved: false,
      reason: isMissingTableError(insert.error)
        ? "manual_extracted_looks migration has not been applied yet."
        : insert.error.message,
    };
  }

  const looks = await getManualExtractedLooks(input.manualResultId);
  await updateManualResultExtractedLookCount(input.manualResultId, looks.looks.length);
  return { look: looks.looks.find((look) => look.id === id) ?? null, saved: true, reason: null };
}

export async function updateManualExtractedLook(id: string, input: Partial<ManualExtractedLookInput>) {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return { look: null, saved: false, reason: "No user session is available." };
  }

  const update = await supabase
    .from("manual_extracted_looks")
    .update({
      title: input.title,
      occasion: input.occasion,
      fit: input.fit,
      color_mood: input.colorMood,
      items: input.items,
      colors: input.colors,
      footwear: input.footwear,
      accessories: input.accessories,
      why_it_works: input.whyItWorks,
      match_score: input.matchScore,
      metadata_json: input.metadata,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("manual_result_id")
    .single();

  if (update.error) {
    return {
      look: null,
      saved: false,
      reason: isMissingTableError(update.error)
        ? "manual_extracted_looks migration has not been applied yet."
        : update.error.message,
    };
  }

  const looks = await getManualExtractedLooks(update.data.manual_result_id);
  return { look: looks.looks.find((look) => look.id === id) ?? null, saved: true, reason: null };
}

export async function deleteManualExtractedLook(id: string) {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return { deleted: false, reason: "No user session is available." };
  }

  const current = await supabase
    .from("manual_extracted_looks")
    .select("manual_result_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (current.error) {
    return {
      deleted: false,
      reason: isMissingTableError(current.error)
        ? "manual_extracted_looks migration has not been applied yet."
        : current.error.message,
    };
  }

  const removed = await supabase
    .from("manual_extracted_looks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (removed.error) {
    return { deleted: false, reason: removed.error.message };
  }

  const looks = await getManualExtractedLooks(current.data.manual_result_id);
  await updateManualResultExtractedLookCount(current.data.manual_result_id, looks.looks.length);
  return { deleted: true, reason: null };
}

export async function getManualExtractedLooksAsReferenceLooks(manualResultId: string) {
  const result = await getManualExtractedLooks(manualResultId);
  if (!result.available) {
    return { referenceLooks: [] as ReferenceLook[], available: false, reason: result.reason };
  }

  const fallbackImageUrl = await getManualResultImageUrl(manualResultId);
  return {
    referenceLooks: result.looks.map((look, index) => toReferenceLook(look, fallbackImageUrl, index)),
    available: true,
    reason: null,
  };
}

function toReferenceLook(look: ManualExtractedLookItem, fallbackImageUrl: string | null, index: number): ReferenceLook {
  const score = Math.max(0, Math.min(100, look.matchScore ?? 82));
  const colors = look.colors.length ? look.colors : splitList(look.colorMood ?? "");
  return {
    id: `manual-${look.id}`,
    title: look.title,
    occasion: look.occasion || "travel style",
    fit: look.fit || "relaxed",
    colorMood: look.colorMood || colors.join(" / ") || "imported palette",
    items: look.items.length ? look.items : ["imported outfit reference"],
    whyItFits: look.whyItWorks || "Manually extracted from a Prompt Lab imported board.",
    referenceImageUrl: look.sourceCropUrl || look.sourceImageUrl || fallbackImageUrl || buildFallbackSvg(look.title, index),
    source: "manual",
    sourceUrl: null,
    sourceName: "Prompt Lab Import",
    photographer: "",
    photographerUrl: null,
    attributionText: "Manual Prompt Lab import",
    promptHint: [look.title, look.items.join(", "), look.colorMood].filter(Boolean).join(" / "),
    selected: false,
    overallMatchScore: score,
    bodyFitScore: score,
    colorScore: score,
    occasionScore: score,
    preferenceScore: score,
    whyThisMatches: [look.whyItWorks || "Imported from a manual ChatGPT-style board."],
    matchTags: ["Prompt Lab", look.fit || "imported"].filter(Boolean),
  };
}

async function getManualResultSourcePath(manualResultId: string) {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return null;
  const query = await supabase
    .from("manual_prompt_results")
    .select("imported_image_path")
    .eq("id", manualResultId)
    .eq("user_id", user.id)
    .single();
  return query.data?.imported_image_path ?? null;
}

async function getManualResultImageUrl(manualResultId: string) {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return null;
  const query = await supabase
    .from("manual_prompt_results")
    .select("imported_image_path, imported_image_url")
    .eq("id", manualResultId)
    .eq("user_id", user.id)
    .single();
  if (!query.data) return null;
  return getDisplayUrl(query.data as ManualPromptResultImageRow);
}

async function rowToItem(row: ManualExtractedLookRow): Promise<ManualExtractedLookItem> {
  return {
    id: row.id,
    manualResultId: row.manual_result_id,
    boardId: row.board_id,
    title: row.title,
    occasion: row.occasion,
    fit: row.fit,
    colorMood: row.color_mood,
    items: ensureStringArray(row.items),
    colors: ensureStringArray(row.colors),
    footwear: ensureStringArray(row.footwear),
    accessories: ensureStringArray(row.accessories),
    whyItWorks: row.why_it_works,
    matchScore: row.match_score,
    sourceImagePath: row.source_image_path,
    sourceCropPath: row.source_crop_path,
    sourceImageUrl: await signedUrl(row.source_image_path),
    sourceCropUrl: await signedUrl(row.source_crop_path),
    metadata: row.metadata_json ?? {},
    createdAt: row.created_at,
  };
}

async function getDisplayUrl(row: ManualPromptResultImageRow) {
  if (row.imported_image_path) {
    const signed = await signedUrl(row.imported_image_path);
    if (signed) return signed;
  }
  return row.imported_image_url;
}

async function signedUrl(path: string | null) {
  if (!path) return null;
  const { supabase } = await getCurrentUser();
  if (!supabase) return null;
  const signed = await supabase.storage
    .from(storageBuckets.generatedBoards)
    .createSignedUrl(path, 60 * 60);
  return signed.data?.signedUrl ?? null;
}

async function updateManualResultExtractedLookCount(manualResultId: string, count: number) {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return;
  const current = await supabase
    .from("manual_prompt_results")
    .select("metadata_json")
    .eq("id", manualResultId)
    .eq("user_id", user.id)
    .single();
  if (current.error) return;
  const metadata = (current.data?.metadata_json ?? {}) as Record<string, unknown>;
  await supabase
    .from("manual_prompt_results")
    .update({ metadata_json: { ...metadata, extractedLookCount: count, hasExtractedLooks: count > 0 } })
    .eq("id", manualResultId)
    .eq("user_id", user.id);
}

function ensureStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function splitList(value: string) {
  return value.split(/[\/,]/).map((item) => item.trim()).filter(Boolean);
}

function buildFallbackSvg(title: string, index: number) {
  const hue = 36 + (index * 47) % 180;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1125" viewBox="0 0 900 1125"><rect width="900" height="1125" fill="hsl(${hue} 38% 88%)"/><rect x="96" y="88" width="708" height="949" rx="34" fill="#fffaf2" stroke="#d8c8b2" stroke-width="4"/><circle cx="450" cy="235" r="66" fill="#b9825e"/><path d="M360 340h180c58 82 76 186 52 330H308c-20-138-4-252 52-330z" fill="#1f4a56"/><path d="M330 670h128l-18 308h-92z" fill="#756f64"/><path d="M476 670h122v308h-92z" fill="#756f64"/><text x="450" y="108" text-anchor="middle" font-family="Arial" font-size="30" font-weight="700" fill="#203238">${escapeSvg(title)}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeSvg(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function isMissingTableError(error: { code?: string; message?: string }) {
  return error.code === "42P01" || /manual_extracted_looks/i.test(error.message ?? "");
}

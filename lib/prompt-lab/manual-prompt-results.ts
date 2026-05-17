import { randomUUID } from "node:crypto";
import type { PromptLabPromptVersion } from "@/lib/prompts/prompt-lab";
import { imageStringToUploadable } from "@/lib/storage-utils";
import { storageBuckets } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

export type ManualPromptQualityChecklist = {
  resemblesUser: boolean;
  fullBodyVisible: boolean;
  styleVarietyGood: boolean;
  outfitLabelsUseful: boolean;
  boardUsableForDemo: boolean;
};

export type ManualPromptQuality = {
  status: "pass" | "needs_work";
  checklist: ManualPromptQualityChecklist;
  notes: string[];
  customNote?: string;
  updatedAt: string;
};

export type ManualPromptResultInput = {
  boardId?: string | null;
  promptVersion: PromptLabPromptVersion;
  promptUsed: string;
  importedImage: string;
  metadata?: Record<string, unknown>;
};

export type ManualPromptResultItem = {
  id: string;
  boardId?: string | null;
  boardTitle?: string | null;
  promptVersion: string | null;
  promptUsed?: string | null;
  importedImageUrl?: string | null;
  source: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

type ManualPromptResultRow = {
  id: string;
  board_id: string | null;
  prompt_version: string | null;
  prompt_used?: string | null;
  imported_image_path: string | null;
  imported_image_url: string | null;
  source: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  boards?: { title?: string | null } | null;
};

export async function persistManualPromptResult(input: ManualPromptResultInput) {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return {
      id: null,
      persisted: false,
      importedImageUrl: input.importedImage,
      skippedReason: "Manual import preview is local only because no user session is available.",
    };
  }

  const resultId = randomUUID();
  let importedImagePath: string | null = null;
  let importedImageUrl: string | null = null;
  const storageMetadata: Record<string, unknown> = {};

  try {
    const uploadable = await imageStringToUploadable(input.importedImage);
    importedImagePath = `${user.id}/manual-imports/${resultId}.${uploadable.extension}`;
    const upload = await supabase.storage
      .from(storageBuckets.generatedBoards)
      .upload(importedImagePath, uploadable.buffer, {
        contentType: uploadable.mimeType,
        upsert: true,
      });

    if (upload.error) {
      storageMetadata.storageWarning = upload.error.message;
      importedImagePath = null;
      importedImageUrl = input.importedImage;
    } else {
      const signed = await supabase.storage
        .from(storageBuckets.generatedBoards)
        .createSignedUrl(importedImagePath, 60 * 60 * 24 * 7);
      importedImageUrl = signed.data?.signedUrl ?? input.importedImage;
      if (signed.error) {
        storageMetadata.storageSignedUrlWarning = signed.error.message;
      }
    }
  } catch (error) {
    storageMetadata.storageWarning = error instanceof Error ? error.message : "Could not save manual import image.";
    importedImagePath = null;
    importedImageUrl = input.importedImage;
  }

  const metadata = {
    ...(input.metadata ?? {}),
    ...storageMetadata,
  };

  const insert = await supabase.from("manual_prompt_results").insert({
    id: resultId,
    user_id: user.id,
    board_id: input.boardId ?? null,
    prompt_version: input.promptVersion,
    prompt_used: input.promptUsed,
    imported_image_path: importedImagePath,
    imported_image_url: importedImageUrl,
    source: "manual-chatgpt",
    metadata_json: metadata,
  });

  if (insert.error) {
    return {
      id: null,
      persisted: false,
      importedImageUrl: importedImageUrl ?? input.importedImage,
      skippedReason: isMissingTableError(insert.error)
        ? "manual_prompt_results migration has not been applied yet."
        : insert.error.message,
    };
  }

  return {
    id: resultId,
    persisted: true,
    importedImageUrl,
    skippedReason: null,
  };
}

export async function getManualPromptResults(limit = 8) {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return { results: [] as ManualPromptResultItem[], available: false, reason: "Sign in to view manual prompt imports." };
  }

  const query = await supabase
    .from("manual_prompt_results")
    .select("id, board_id, prompt_version, imported_image_path, imported_image_url, source, metadata_json, created_at, boards(title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (query.error) {
    return {
      results: [] as ManualPromptResultItem[],
      available: false,
      reason: isMissingTableError(query.error)
        ? "manual_prompt_results migration has not been applied yet."
        : query.error.message,
    };
  }

  const rows = (query.data ?? []) as ManualPromptResultRow[];
  const results = await Promise.all(rows.map(rowToResultItem));
  return { results, available: true, reason: null };
}

export async function getManualPromptResult(resultId: string) {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return { result: null, available: false, reason: "Sign in to view manual prompt imports." };
  }

  const query = await supabase
    .from("manual_prompt_results")
    .select("id, board_id, prompt_version, prompt_used, imported_image_path, imported_image_url, source, metadata_json, created_at, boards(title)")
    .eq("id", resultId)
    .eq("user_id", user.id)
    .single();

  if (query.error) {
    return {
      result: null,
      available: false,
      reason: isMissingTableError(query.error)
        ? "manual_prompt_results migration has not been applied yet."
        : query.error.message,
    };
  }

  return { result: await rowToResultItem(query.data as ManualPromptResultRow), available: true, reason: null };
}

export async function updateManualPromptResultMetadata(
  resultId: string,
  metadataPatch: Record<string, unknown>,
) {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return { saved: false, reason: "No user session is available." };
  }

  const current = await supabase
    .from("manual_prompt_results")
    .select("metadata_json")
    .eq("id", resultId)
    .eq("user_id", user.id)
    .single();

  if (current.error) {
    return {
      saved: false,
      reason: isMissingTableError(current.error)
        ? "manual_prompt_results migration has not been applied yet."
        : current.error.message,
    };
  }

  const metadata = {
    ...((current.data?.metadata_json ?? {}) as Record<string, unknown>),
    ...metadataPatch,
  };

  const update = await supabase
    .from("manual_prompt_results")
    .update({ metadata_json: metadata })
    .eq("id", resultId)
    .eq("user_id", user.id);

  if (update.error) {
    return { saved: false, reason: update.error.message };
  }

  return { saved: true, reason: null };
}

async function rowToResultItem(row: ManualPromptResultRow): Promise<ManualPromptResultItem> {
  return {
    id: row.id,
    boardId: row.board_id,
    boardTitle: row.boards?.title ?? null,
    promptVersion: row.prompt_version,
    promptUsed: row.prompt_used ?? null,
    importedImageUrl: await getDisplayUrl(row.imported_image_path, row.imported_image_url),
    source: row.source ?? "manual-chatgpt",
    metadata: row.metadata_json,
    createdAt: row.created_at,
  };
}

async function getDisplayUrl(path: string | null, fallbackUrl: string | null) {
  if (!path) {
    return fallbackUrl;
  }

  const { supabase } = await getCurrentUser();
  if (!supabase) {
    return fallbackUrl;
  }

  const signed = await supabase.storage
    .from(storageBuckets.generatedBoards)
    .createSignedUrl(path, 60 * 60);
  return signed.data?.signedUrl ?? fallbackUrl;
}

function isMissingTableError(error: { code?: string; message?: string }) {
  return error.code === "42P01" || /manual_prompt_results/i.test(error.message ?? "");
}

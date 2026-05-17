import { randomUUID } from "node:crypto";
import type { AiProviderId } from "@/lib/ai/provider-router";
import type { ProviderTestPromptVersion } from "@/lib/prompts/provider-test-image-prompt";
import type { ReferenceLook } from "@/lib/schemas";
import { imageStringToUploadable } from "@/lib/storage-utils";
import { storageBuckets } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

export type ProviderTestRunStatus = "success" | "blocked" | "error";

export type ProviderTestQualityChecklist = {
  fullBodyVisible: boolean;
  resemblanceAcceptable: boolean;
  outfitMatchesReference: boolean;
  wearableStyling: boolean;
  noMajorArtifacts: boolean;
  usefulForDemo: boolean;
};

export type ProviderTestQuality = {
  status: "pass" | "needs_work";
  checklist: ProviderTestQualityChecklist;
  notes: string[];
  customNote?: string;
  suggestedNextAction?: string;
  updatedAt: string;
};

export type ProviderTestRunInput = {
  provider: AiProviderId;
  model?: string | null;
  status: ProviderTestRunStatus;
  selectedReferenceLook?: ReferenceLook | null;
  promptVersion?: ProviderTestPromptVersion | null;
  promptUsed?: string | null;
  estimatedCostUsd?: number | null;
  actualCostUsd?: number | null;
  outputImage?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
};

export type ProviderTestRunPersistenceResult = {
  runId: string | null;
  persisted: boolean;
  outputImagePath?: string | null;
  outputImageUrl?: string | null;
  skippedReason?: string;
};

export type ProviderTestRunHistoryItem = {
  id: string;
  provider: AiProviderId;
  model?: string | null;
  status: ProviderTestRunStatus;
  promptVersion?: string | null;
  estimatedCostUsd?: number | null;
  outputImageUrl?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type ProviderTestRunDetail = ProviderTestRunHistoryItem & {
  actualCostUsd?: number | null;
  imageCount: number;
  selectedReferenceLook?: ReferenceLook | null;
  promptUsed?: string | null;
};

type ProviderTestRunRow = {
  id: string;
  provider: AiProviderId;
  model: string | null;
  status: ProviderTestRunStatus;
  selected_reference_look_json?: ReferenceLook | null;
  prompt_version: string | null;
  prompt_used?: string | null;
  estimated_cost_usd: number | string | null;
  actual_cost_usd?: number | string | null;
  image_count?: number | null;
  output_image_path: string | null;
  output_image_url: string | null;
  error_message: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
};

export async function persistProviderTestRun(
  input: ProviderTestRunInput,
): Promise<ProviderTestRunPersistenceResult> {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return {
      runId: null,
      persisted: false,
      skippedReason: "Provider test history is local only because no user session is available.",
    };
  }

  const runId = randomUUID();
  let outputImagePath: string | null = null;
  let outputImageUrl: string | null = null;
  const storageMetadata: Record<string, unknown> = {};

  if (input.outputImage) {
    try {
      const uploadable = await imageStringToUploadable(input.outputImage);
      outputImagePath = `${user.id}/provider-tests/${runId}.${uploadable.extension}`;
      const upload = await supabase.storage
        .from(storageBuckets.generatedOutfits)
        .upload(outputImagePath, uploadable.buffer, {
          contentType: uploadable.mimeType,
          upsert: true,
        });

      if (upload.error) {
        storageMetadata.storageWarning = upload.error.message;
        outputImagePath = null;
      } else {
        const signed = await supabase.storage
          .from(storageBuckets.generatedOutfits)
          .createSignedUrl(outputImagePath, 60 * 60 * 24 * 7);
        outputImageUrl = signed.data?.signedUrl ?? null;
        if (signed.error) {
          storageMetadata.storageSignedUrlWarning = signed.error.message;
        }
      }
    } catch (error) {
      storageMetadata.storageWarning =
        error instanceof Error ? error.message : "Could not save provider test image.";
      outputImagePath = null;
      outputImageUrl = null;
    }
  }

  const metadata = {
    ...(input.metadata ?? {}),
    ...storageMetadata,
  };

  const insert = await supabase.from("provider_test_runs").insert({
    id: runId,
    user_id: user.id,
    provider: input.provider,
    model: input.model ?? null,
    status: input.status,
    selected_reference_look_json: input.selectedReferenceLook ?? null,
    prompt_version: input.promptVersion ?? null,
    prompt_used: input.promptUsed ?? null,
    estimated_cost_usd: input.estimatedCostUsd ?? null,
    actual_cost_usd: input.actualCostUsd ?? null,
    image_count: 1,
    output_image_path: outputImagePath,
    output_image_url: outputImageUrl,
    error_message: input.errorMessage ?? null,
    metadata_json: metadata,
  });

  if (insert.error) {
    return {
      runId: null,
      persisted: false,
      outputImagePath,
      outputImageUrl,
      skippedReason: isMissingTableError(insert.error)
        ? "provider_test_runs migration has not been applied yet."
        : insert.error.message,
    };
  }

  return {
    runId,
    persisted: true,
    outputImagePath,
    outputImageUrl,
  };
}

export async function getProviderTestRuns(limit = 8) {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return {
      runs: [] as ProviderTestRunHistoryItem[],
      available: false,
      reason: "Sign in to view provider test history.",
    };
  }

  const query = await supabase
    .from("provider_test_runs")
    .select(
      "id, provider, model, status, prompt_version, estimated_cost_usd, output_image_path, output_image_url, error_message, metadata_json, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (query.error) {
    return {
      runs: [] as ProviderTestRunHistoryItem[],
      available: false,
      reason: isMissingTableError(query.error)
        ? "provider_test_runs migration has not been applied yet."
        : query.error.message,
    };
  }

  const rows = (query.data ?? []) as ProviderTestRunRow[];
  const runs = await Promise.all(rows.map(rowToHistoryItem));

  return {
    runs,
    available: true,
    reason: null,
  };
}

export async function getProviderTestRun(runId: string) {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return { run: null, available: false, reason: "Sign in to view provider test runs." };
  }

  const query = await supabase
    .from("provider_test_runs")
    .select(
      "id, provider, model, status, selected_reference_look_json, prompt_version, prompt_used, estimated_cost_usd, actual_cost_usd, image_count, output_image_path, output_image_url, error_message, metadata_json, created_at",
    )
    .eq("id", runId)
    .eq("user_id", user.id)
    .single();

  if (query.error) {
    return {
      run: null,
      available: false,
      reason: isMissingTableError(query.error)
        ? "provider_test_runs migration has not been applied yet."
        : query.error.message,
    };
  }

  const row = query.data as ProviderTestRunRow;
  const history = await rowToHistoryItem(row);
  const run: ProviderTestRunDetail = {
    ...history,
    actualCostUsd: row.actual_cost_usd === null || row.actual_cost_usd === undefined ? null : Number(row.actual_cost_usd),
    imageCount: row.image_count ?? 1,
    selectedReferenceLook: row.selected_reference_look_json ?? null,
    promptUsed: row.prompt_used ?? null,
  };

  return { run, available: true, reason: null };
}

export async function updateProviderTestRunQuality(
  runId: string,
  quality: ProviderTestQuality,
) {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return { saved: false, reason: "No user session is available." };
  }

  const current = await supabase
    .from("provider_test_runs")
    .select("metadata_json")
    .eq("id", runId)
    .eq("user_id", user.id)
    .single();

  if (current.error) {
    return {
      saved: false,
      reason: isMissingTableError(current.error)
        ? "provider_test_runs migration has not been applied yet."
        : current.error.message,
    };
  }

  const currentMetadata = (current.data?.metadata_json ?? {}) as Record<string, unknown>;
  const update = await supabase
    .from("provider_test_runs")
    .update({
      metadata_json: {
        ...currentMetadata,
        quality,
      },
    })
    .eq("id", runId)
    .eq("user_id", user.id);

  if (update.error) {
    return { saved: false, reason: update.error.message };
  }

  return { saved: true, reason: null };
}

async function rowToHistoryItem(row: ProviderTestRunRow): Promise<ProviderTestRunHistoryItem> {
  return {
    id: row.id,
    provider: row.provider,
    model: row.model,
    status: row.status,
    promptVersion: row.prompt_version,
    estimatedCostUsd:
      row.estimated_cost_usd === null ? null : Number(row.estimated_cost_usd),
    outputImageUrl: await getDisplayUrl(row.output_image_path, row.output_image_url),
    errorMessage: row.error_message,
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
    .from(storageBuckets.generatedOutfits)
    .createSignedUrl(path, 60 * 60);
  return signed.data?.signedUrl ?? fallbackUrl;
}

function isMissingTableError(error: { code?: string; message?: string }) {
  return error.code === "42P01" || /provider_test_runs/i.test(error.message ?? "");
}
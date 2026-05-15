import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildStyleMemorySummary,
  emptyStyleMemory,
  type PersistedStyleFeedbackRow,
} from "@/lib/feedback/feedback-memory";
import type { StyleMemorySummary } from "@/lib/schemas";

const feedbackColumns =
  "reference_look_id, feedback_type, look_title, occasion, fit, color_mood, items, score_snapshot, created_at";

type FeedbackLoadResult = {
  rows: PersistedStyleFeedbackRow[];
  memory: StyleMemorySummary;
  available: boolean;
};

function isMissingFeedbackTable(error: { code?: string; message?: string }) {
  return error.code === "42P01" || error.message?.includes("style_feedback");
}

function normalizeRows(rows: unknown[]): PersistedStyleFeedbackRow[] {
  return rows.map((row) => {
    const value = row as Partial<PersistedStyleFeedbackRow>;
    return {
      reference_look_id: value.reference_look_id ?? "",
      feedback_type: value.feedback_type ?? "selected",
      look_title: value.look_title ?? null,
      occasion: value.occasion ?? null,
      fit: value.fit ?? null,
      color_mood: value.color_mood ?? null,
      items: Array.isArray(value.items) ? value.items : null,
      score_snapshot: value.score_snapshot ?? null,
      created_at: value.created_at ?? null,
    };
  });
}

export async function loadStyleFeedbackMemory(
  supabase: SupabaseClient,
  userId: string,
  limit = 200,
): Promise<FeedbackLoadResult> {
  const result = await supabase
    .from("style_feedback")
    .select(feedbackColumns)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (result.error) {
    if (isMissingFeedbackTable(result.error)) {
      return { rows: [], memory: emptyStyleMemory, available: false };
    }
    throw result.error;
  }

  const rows = normalizeRows((result.data ?? []) as unknown[]);
  return {
    rows,
    memory: buildStyleMemorySummary(rows),
    available: true,
  };
}

export async function resetStyleFeedbackMemory(
  supabase: SupabaseClient,
  userId: string,
) {
  const result = await supabase
    .from("style_feedback")
    .delete()
    .eq("user_id", userId);

  if (result.error) {
    if (isMissingFeedbackTable(result.error)) {
      return { ok: true, available: false };
    }
    throw result.error;
  }

  return { ok: true, available: true };
}

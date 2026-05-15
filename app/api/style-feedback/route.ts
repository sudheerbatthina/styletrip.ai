import { NextResponse } from "next/server";
import {
  loadStyleFeedbackMemory,
  resetStyleFeedbackMemory,
} from "@/lib/feedback/feedback-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { styleFeedbackRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return jsonError("Supabase is not configured. Feedback persistence is disabled.", 503);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("You must be logged in to save feedback.", 401);
    }

    const body = await request.json();
    const parsed = styleFeedbackRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Invalid feedback request.");
    }

    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      updated_at: new Date().toISOString(),
    });

    const feedback = parsed.data;
    const result = await supabase.from("style_feedback").insert({
      user_id: user.id,
      board_id: feedback.boardId ?? null,
      reference_look_id: feedback.referenceLookId,
      feedback_type: feedback.feedbackType,
      look_title: feedback.lookTitle,
      occasion: feedback.occasion,
      fit: feedback.fit,
      color_mood: feedback.colorMood,
      items: feedback.items,
      score_snapshot: feedback.scoreSnapshot,
    });

    if (result.error) {
      if (result.error.code === "42P01") {
        return NextResponse.json(
          {
            ok: true,
            persisted: false,
            reason: "style_feedback table is not available yet.",
          },
          { status: 202 },
        );
      }
      throw result.error;
    }

    return NextResponse.json({ ok: true, persisted: true });
  } catch (error) {
    console.error("style feedback failed", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to save feedback.",
      500,
    );
  }
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return jsonError("Supabase is not configured. Feedback memory is disabled.", 503);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("You must be logged in to load feedback.", 401);
    }

    const result = await loadStyleFeedbackMemory(supabase, user.id);
    return NextResponse.json({
      ok: true,
      available: result.available,
      memory: result.memory,
      recentFeedback: result.rows.slice(0, 20),
    });
  } catch (error) {
    console.error("style feedback load failed", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to load feedback.",
      500,
    );
  }
}

export async function DELETE() {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return jsonError("Supabase is not configured. Feedback memory is disabled.", 503);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("You must be logged in to reset feedback.", 401);
    }

    const result = await resetStyleFeedbackMemory(supabase, user.id);
    return NextResponse.json({
      ok: true,
      available: result.available,
    });
  } catch (error) {
    console.error("style feedback reset failed", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to reset feedback.",
      500,
    );
  }
}

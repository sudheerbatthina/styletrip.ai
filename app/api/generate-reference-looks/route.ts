import { NextResponse } from "next/server";
import { loadStyleFeedbackMemory } from "@/lib/feedback/feedback-service";
import { getReferenceLooksForPlan } from "@/lib/reference/reference-provider";
import {
  referenceLooksRequestSchema,
  referenceLooksResponseSchema,
} from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = referenceLooksRequestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Invalid request.");
    }

    let preferences = parsed.data.preferences;

    try {
      const supabase = await createSupabaseServerClient();
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const memoryResult = await loadStyleFeedbackMemory(supabase, user.id);
          preferences = {
            ...preferences,
            styleMemory: memoryResult.memory,
          };
        }
      }
    } catch (error) {
      console.warn("Style memory unavailable; continuing with local feedback only.", error);
    }

    const result = await getReferenceLooksForPlan({
      ...parsed.data,
      preferences,
      styleIdeas: parsed.data.styleIdeas,
    });
    return NextResponse.json(referenceLooksResponseSchema.parse(result));
  } catch (error) {
    console.error("generate-reference-looks failed", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to generate reference looks.",
      500,
    );
  }
}


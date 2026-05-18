import { NextResponse } from "next/server";
import { buildMockStylePlan } from "@/lib/prompts/style-planner";
import { styleIdeasRequestSchema, stylePlanSchema } from "@/lib/schemas";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = styleIdeasRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Invalid request.");
    }

    const plan = buildMockStylePlan(parsed.data.photoAnalysis, {
      ...parsed.data.preferences,
      styleMemory: parsed.data.styleMemory ?? parsed.data.preferences.styleMemory,
      referenceFeedback: parsed.data.feedback ?? parsed.data.preferences.referenceFeedback,
    });

    return NextResponse.json(stylePlanSchema.parse(plan));
  } catch (error) {
    console.error("generate-style-ideas failed", error);
    return jsonError(error instanceof Error ? error.message : "Failed to generate style ideas.", 500);
  }
}

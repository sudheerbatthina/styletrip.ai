import { NextResponse } from "next/server";
import { refineMockStyleIdeas } from "@/lib/prompts/refinement";
import { refineStyleIdeasRequestSchema, stylePlanSchema } from "@/lib/schemas";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = refineStyleIdeasRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Invalid request.");
    }

    const styleIdeas = refineMockStyleIdeas(parsed.data.currentIdeas, parsed.data.refinementInstruction);
    return NextResponse.json(stylePlanSchema.parse({
      styleIdeas: styleIdeas.slice(0, 6),
      overallDirection: `Updated style direction: ${parsed.data.refinementInstruction}`,
      questionsOrUncertainty: ["Mock refinement preserves photo context and selected preferences without calling paid APIs."],
    }));
  } catch (error) {
    console.error("refine-style-ideas failed", error);
    return jsonError(error instanceof Error ? error.message : "Failed to refine style ideas.", 500);
  }
}

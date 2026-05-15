import { NextResponse } from "next/server";
import { getTextProviderId, isMockMode } from "@/lib/ai/provider-router";
import { analyzePhotoRequestSchema } from "@/lib/schemas";
import { mockAnalysis } from "@/lib/mock-data";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = analyzePhotoRequestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Invalid request.");
    }

    const textProvider = getTextProviderId();
    if (isMockMode() || textProvider === "mock") {
      return NextResponse.json(mockAnalysis);
    }

    return jsonError(
      `${textProvider} text analysis provider is not enabled yet. Use NEXT_PUBLIC_MOCK_MODE=true or AI_TEXT_PROVIDER=mock for local testing.`,
      501,
    );
  } catch (error) {
    console.error("analyze-photo failed", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to analyze photo.",
      500,
    );
  }
}
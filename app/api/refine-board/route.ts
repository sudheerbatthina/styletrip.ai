import { NextResponse } from "next/server";
import { getImageProviderId, getProviderStatus } from "@/lib/ai/provider-router";
import { estimateBoardGenerationCost } from "@/lib/cost/cost-estimator";
import { mockBoardDataUrl } from "@/lib/mock-data";
import { refineBoardRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = refineBoardRequestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Invalid request.");
    }

    const imageProvider = getImageProviderId();
    const costEstimate = estimateBoardGenerationCost({
      imageCount: parsed.data.selectedStyles.length,
    });

    if (costEstimate.mode === "blocked") {
      return jsonError(costEstimate.reason, 402);
    }

    if (imageProvider === "mock") {
      return NextResponse.json({ image: mockBoardDataUrl });
    }

    const providerStatus = getProviderStatus(imageProvider);
    return jsonError(
      providerStatus.reason ?? `${imageProvider} board refinement provider is not enabled yet.`,
      providerStatus.enabled ? 501 : 402,
    );
  } catch (error) {
    console.error("refine-board failed", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to refine board.",
      500,
    );
  }
}

import { NextResponse } from "next/server";
import { estimateBoardGenerationCost } from "@/lib/cost/cost-estimator";
import { getSafeProviderStatus } from "@/lib/ai/provider-router";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const imageCount = Number(url.searchParams.get("imageCount") ?? 4);
  const safeImageCount = Number.isFinite(imageCount) ? Math.max(0, Math.floor(imageCount)) : 4;

  return NextResponse.json({
    ...getSafeProviderStatus(),
    costEstimate: estimateBoardGenerationCost({
      imageCount: safeImageCount,
    }),
  });
}

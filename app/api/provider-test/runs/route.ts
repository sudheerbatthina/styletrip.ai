import { NextResponse } from "next/server";
import { z } from "zod";
import { isProviderTestLabVisible } from "@/lib/ai/provider-router";
import {
  getProviderTestRuns,
  updateProviderTestRunQuality,
} from "@/lib/provider-test/provider-test-runs";

export const runtime = "nodejs";

const qualitySchema = z.object({
  id: z.string().uuid(),
  quality: z.object({
    status: z.enum(["pass", "needs_work"]),
    checklist: z.object({
      fullBodyVisible: z.boolean(),
      resemblanceAcceptable: z.boolean(),
      outfitMatchesReference: z.boolean(),
      wearableStyling: z.boolean(),
      noMajorArtifacts: z.boolean(),
      usefulForDemo: z.boolean(),
    }),
    notes: z.array(z.string().max(120)).max(12),
    customNote: z.string().max(500).optional(),
    suggestedNextAction: z.string().max(400).optional(),
    updatedAt: z.string(),
  }),
});

export async function GET() {
  if (!isProviderTestLabVisible()) {
    return NextResponse.json(
      { runs: [], available: false, reason: "Provider Test Lab is hidden." },
      { status: 403 },
    );
  }

  return NextResponse.json(await getProviderTestRuns());
}

export async function PATCH(request: Request) {
  if (!isProviderTestLabVisible()) {
    return NextResponse.json(
      { saved: false, reason: "Provider Test Lab is hidden." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = qualitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        saved: false,
        reason: parsed.error.errors[0]?.message ?? "Invalid quality checklist.",
      },
      { status: 400 },
    );
  }

  const result = await updateProviderTestRunQuality(
    parsed.data.id,
    parsed.data.quality,
  );
  return NextResponse.json(result, { status: result.saved ? 200 : 202 });
}

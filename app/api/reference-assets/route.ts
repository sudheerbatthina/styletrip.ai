import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createReferenceAsset,
  getReferenceAssets,
} from "@/lib/reference/reference-assets";

export const runtime = "nodejs";

const stringListSchema = z.array(z.string().min(1).max(80)).max(24).optional().default([]);

const referenceAssetSchema = z.object({
  title: z.string().min(1).max(140),
  source: z.string().max(80).optional().default("curated"),
  sourceName: z.string().max(120).nullable().optional(),
  sourceUrl: z.string().max(1000).nullable().optional(),
  photographer: z.string().max(120).nullable().optional(),
  photographerUrl: z.string().max(1000).nullable().optional(),
  attributionText: z.string().max(240).nullable().optional(),
  imageDataUrl: z.string().nullable().optional(),
  imageUrl: z.string().max(8000).nullable().optional(),
  genderStyle: z.string().max(80).nullable().optional(),
  occasionTags: stringListSchema,
  styleTags: stringListSchema,
  fitTags: stringListSchema,
  colorTags: stringListSchema,
  itemTags: stringListSchema,
  seasonTags: stringListSchema,
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 60);
  const result = await getReferenceAssets(Number.isFinite(limit) ? limit : 60);
  return NextResponse.json(result, { status: result.available ? 200 : 202 });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = referenceAssetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { saved: false, asset: null, reason: parsed.error.errors[0]?.message ?? "Invalid reference asset." },
      { status: 400 },
    );
  }

  const result = await createReferenceAsset(parsed.data);
  return NextResponse.json(result, { status: result.saved ? 200 : 202 });
}

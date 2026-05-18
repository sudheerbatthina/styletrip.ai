import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteReferenceAsset,
  updateReferenceAsset,
} from "@/lib/reference/reference-assets";

export const runtime = "nodejs";

const stringListSchema = z.array(z.string().min(1).max(80)).max(24).optional();

const referenceAssetUpdateSchema = z.object({
  title: z.string().min(1).max(140).optional(),
  source: z.string().max(80).optional(),
  sourceName: z.string().max(120).nullable().optional(),
  sourceUrl: z.string().max(1000).nullable().optional(),
  photographer: z.string().max(120).nullable().optional(),
  photographerUrl: z.string().max(1000).nullable().optional(),
  attributionText: z.string().max(240).nullable().optional(),
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const parsed = referenceAssetUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { saved: false, asset: null, reason: parsed.error.errors[0]?.message ?? "Invalid reference asset." },
      { status: 400 },
    );
  }

  const result = await updateReferenceAsset(id, parsed.data);
  return NextResponse.json(result, { status: result.saved ? 200 : 202 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await deleteReferenceAsset(id);
  return NextResponse.json(result, { status: result.deleted ? 200 : 202 });
}

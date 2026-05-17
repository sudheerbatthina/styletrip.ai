import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteManualExtractedLook,
  updateManualExtractedLook,
} from "@/lib/prompt-lab/manual-extracted-looks";

export const runtime = "nodejs";

const updateSchema = z.object({
  title: z.string().min(1).max(120),
  occasion: z.string().max(120).nullable().optional(),
  fit: z.string().max(80).nullable().optional(),
  colorMood: z.string().max(160).nullable().optional(),
  items: z.array(z.string().min(1).max(120)).max(12).default([]),
  colors: z.array(z.string().min(1).max(80)).max(12).default([]),
  footwear: z.array(z.string().min(1).max(100)).max(8).optional().default([]),
  accessories: z.array(z.string().min(1).max(100)).max(8).optional().default([]),
  whyItWorks: z.string().max(500).nullable().optional(),
  matchScore: z.number().int().min(0).max(100).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ look: null, saved: false, reason: parsed.error.errors[0]?.message ?? "Invalid extracted look." }, { status: 400 });
  }

  const result = await updateManualExtractedLook(id, parsed.data);
  return NextResponse.json(result, { status: result.saved ? 200 : 202 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await deleteManualExtractedLook(id);
  return NextResponse.json(result, { status: result.deleted ? 200 : 202 });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createManualExtractedLook,
  getManualExtractedLooks,
  getManualExtractedLooksAsReferenceLooks,
} from "@/lib/prompt-lab/manual-extracted-looks";

export const runtime = "nodejs";

const extractedLookSchema = z.object({
  manualResultId: z.string().uuid(),
  boardId: z.string().uuid().nullable().optional(),
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const manualResultId = url.searchParams.get("manualResultId") ?? "";
  const asReferenceLooks = url.searchParams.get("asReferenceLooks") === "true";

  if (!manualResultId) {
    return NextResponse.json({ looks: [], available: false, reason: "manualResultId is required." }, { status: 400 });
  }

  if (asReferenceLooks) {
    const result = await getManualExtractedLooksAsReferenceLooks(manualResultId);
    return NextResponse.json(result, { status: result.available ? 200 : 202 });
  }

  const result = await getManualExtractedLooks(manualResultId);
  return NextResponse.json(result, { status: result.available ? 200 : 202 });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = extractedLookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ look: null, saved: false, reason: parsed.error.errors[0]?.message ?? "Invalid extracted look." }, { status: 400 });
  }

  const result = await createManualExtractedLook(parsed.data);
  return NextResponse.json(result, { status: result.saved ? 200 : 202 });
}

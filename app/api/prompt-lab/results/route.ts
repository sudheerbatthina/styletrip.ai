import { NextResponse } from "next/server";
import { z } from "zod";
import { isPromptLabVisible } from "@/lib/ai/provider-router";
import {
  getManualPromptResults,
  persistManualPromptResult,
  updateManualPromptResultMetadata,
} from "@/lib/prompt-lab/manual-prompt-results";
import { normalizePromptLabPromptVersion, promptLabPromptVersions } from "@/lib/prompts/prompt-lab";

export const runtime = "nodejs";

const importSchema = z.object({
  boardId: z.string().uuid().nullable().optional(),
  promptVersion: z.enum(promptLabPromptVersions),
  promptUsed: z.string().min(20).max(8000),
  importedImage: z.string().min(20),
  metadata: z.record(z.unknown()).optional(),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  quality: z
    .object({
      status: z.enum(["pass", "needs_work"]),
      checklist: z.object({
        resemblesUser: z.boolean(),
        fullBodyVisible: z.boolean(),
        styleVarietyGood: z.boolean(),
        outfitLabelsUseful: z.boolean(),
        boardUsableForDemo: z.boolean(),
      }),
      notes: z.array(z.string().max(120)).max(12),
      customNote: z.string().max(500).optional(),
      updatedAt: z.string(),
    })
    .optional(),
  useAsInspiration: z.boolean().optional(),
});

export async function GET() {
  if (!isPromptLabVisible()) {
    return NextResponse.json(
      { results: [], available: false, reason: "Prompt Lab is hidden." },
      { status: 403 },
    );
  }

  return NextResponse.json(await getManualPromptResults());
}

export async function POST(request: Request) {
  if (!isPromptLabVisible()) {
    return NextResponse.json(
      { persisted: false, reason: "Prompt Lab is hidden." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        persisted: false,
        reason: parsed.error.errors[0]?.message ?? "Invalid manual import.",
      },
      { status: 400 },
    );
  }

  const result = await persistManualPromptResult({
    ...parsed.data,
    promptVersion: normalizePromptLabPromptVersion(parsed.data.promptVersion),
  });
  return NextResponse.json(result, { status: result.persisted ? 200 : 202 });
}

export async function PATCH(request: Request) {
  if (!isPromptLabVisible()) {
    return NextResponse.json(
      { saved: false, reason: "Prompt Lab is hidden." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        saved: false,
        reason: parsed.error.errors[0]?.message ?? "Invalid manual result update.",
      },
      { status: 400 },
    );
  }

  const metadataPatch: Record<string, unknown> = {};
  if (parsed.data.quality) {
    metadataPatch.quality = parsed.data.quality;
  }
  if (typeof parsed.data.useAsInspiration === "boolean") {
    metadataPatch.useAsInspiration = parsed.data.useAsInspiration;
    metadataPatch.useAsInspirationUpdatedAt = new Date().toISOString();
  }

  const result = await updateManualPromptResultMetadata(parsed.data.id, metadataPatch);
  return NextResponse.json(result, { status: result.saved ? 200 : 202 });
}

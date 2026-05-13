import { NextResponse } from "next/server";
import { toFile } from "openai/uploads";
import { getImageModel, getOpenAIClient, isMockMode } from "@/lib/openai";
import { mockBoardDataUrl } from "@/lib/mock-data";
import { buildBoardGenerationPrompt } from "@/lib/prompts/board-generation";
import { refineBoardRequestSchema } from "@/lib/schemas";
import { stripDataUrlPrefix } from "@/lib/image-utils";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function generateRefinedImage({
  prompt,
  imageDataUrl,
  mimeType,
  useReference,
}: {
  prompt: string;
  imageDataUrl: string;
  mimeType: string;
  useReference: boolean;
}) {
  const client = getOpenAIClient();
  const model = getImageModel();

  if (useReference) {
    const referenceImage = await toFile(
      Buffer.from(stripDataUrlPrefix(imageDataUrl), "base64"),
      "style-reference.png",
      { type: mimeType },
    );

    const edited = await client.images.edit({
      model,
      image: referenceImage,
      prompt,
      size: "1024x1024",
    } as never);
    const editedB64 = edited.data?.[0]?.b64_json;
    if (editedB64) {
      return `data:image/png;base64,${editedB64}`;
    }
    const editedUrl = edited.data?.[0]?.url;
    if (editedUrl) {
      return editedUrl;
    }
  }

  const generated = await client.images.generate({
    model,
    prompt,
    // Keep model names configurable; image size is conservative for broad model support.
    size: "1024x1024",
    response_format: "b64_json",
  } as never);
  const b64 = generated.data?.[0]?.b64_json;
  if (b64) {
    return `data:image/png;base64,${b64}`;
  }
  const url = generated.data?.[0]?.url;
  if (url) {
    return url;
  }

  throw new Error("The image model returned no image.");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = refineBoardRequestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Invalid request.");
    }

    if (isMockMode()) {
      return NextResponse.json({ image: mockBoardDataUrl });
    }

    const {
      image,
      analysis,
      selectedStyles,
      preferences,
      editInstruction,
    } = parsed.data;
    const prompt = buildBoardGenerationPrompt({
      analysis,
      selectedStyles,
      preferences,
      editInstruction,
    });

    const generatedImage = await generateRefinedImage({
      prompt,
      imageDataUrl: image.dataUrl,
      mimeType: image.mimeType,
      useReference: preferences.usePhotoReferenceConsent,
    });

    return NextResponse.json({ image: generatedImage });
  } catch (error) {
    console.error("refine-board failed", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to refine board.",
      500,
    );
  }
}

import { NextResponse } from "next/server";
import { toFile } from "openai/uploads";
import { getImageModel, getOpenAIClient, isMockMode } from "@/lib/openai";
import { mockBoardDataUrl } from "@/lib/mock-data";
import { buildBoardGenerationPrompt } from "@/lib/prompts/board-generation";
import { boardRequestSchema } from "@/lib/schemas";
import { stripDataUrlPrefix } from "@/lib/image-utils";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function generateImageDataUrl({
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
    const imageBuffer = Buffer.from(stripDataUrlPrefix(imageDataUrl), "base64");
    const referenceImage = await toFile(imageBuffer, "style-reference.png", {
      type: mimeType,
    });

    const edited = await client.images.edit({
      model,
      image: referenceImage,
      prompt,
      size: "1024x1024",
    } as never);
    const b64 = edited.data?.[0]?.b64_json;
    if (b64) {
      return `data:image/png;base64,${b64}`;
    }
    const url = edited.data?.[0]?.url;
    if (url) {
      return url;
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
    const parsed = boardRequestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Invalid request.");
    }

    if (isMockMode()) {
      return NextResponse.json({ image: mockBoardDataUrl });
    }

    const { image, analysis, selectedStyles, preferences } = parsed.data;
    const prompt = buildBoardGenerationPrompt({
      analysis,
      selectedStyles,
      preferences,
    });

    const generatedImage = await generateImageDataUrl({
      prompt,
      imageDataUrl: image.dataUrl,
      mimeType: image.mimeType,
      useReference: preferences.usePhotoReferenceConsent,
    });

    return NextResponse.json({ image: generatedImage });
  } catch (error) {
    console.error("generate-style-board failed", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to generate board.",
      500,
    );
  }
}

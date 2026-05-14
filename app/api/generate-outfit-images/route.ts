import { NextResponse } from "next/server";
import { toFile } from "openai/uploads";
import { getImageModel, getOpenAIClient, isMockMode } from "@/lib/openai";
import { buildMockOutfitImage } from "@/lib/mock-data";
import { stripDataUrlPrefix } from "@/lib/image-utils";
import { buildOutfitImagePrompt } from "@/lib/prompts/outfit-image";
import {
  outfitImagesRequestSchema,
  outfitImagesResponseSchema,
  type OutfitImage,
} from "@/lib/schemas";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function generateOneOutfitImage({
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
    const parsed = outfitImagesRequestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Invalid request.");
    }

    const { image, analysis, preferences, selectedStyles, editInstruction } =
      parsed.data;

    if (isMockMode()) {
      return NextResponse.json(
        outfitImagesResponseSchema.parse({
          outfitImages: selectedStyles.map((style, index) => ({
            styleId: style.id,
            image: buildMockOutfitImage(style.title, index),
            promptUsed: "mock-reference-look-mode",
          })),
        }),
      );
    }

    if (process.env.ENABLE_PAID_IMAGE_GENERATION !== "true") {
      return jsonError(
        "Personalized image generation is not enabled yet. Cost confirmation will be added before real providers run.",
        402,
      );
    }

    const outfitImages: OutfitImage[] = [];

    for (const style of selectedStyles) {
      const prompt = buildOutfitImagePrompt({
        analysis,
        preferences,
        style,
        editInstruction,
      });
      const generatedImage = await generateOneOutfitImage({
        prompt,
        imageDataUrl: image.dataUrl,
        mimeType: image.mimeType,
        useReference: preferences.usePhotoReferenceConsent,
      });

      outfitImages.push({
        styleId: style.id,
        image: generatedImage,
        promptUsed: prompt,
      });
    }

    return NextResponse.json(outfitImagesResponseSchema.parse({ outfitImages }));
  } catch (error) {
    console.error("generate-outfit-images failed", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to generate outfit images.",
      500,
    );
  }
}


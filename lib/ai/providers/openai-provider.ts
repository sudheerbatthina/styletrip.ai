import {
  getMissingProviderKey,
  isPaidImageGenerationEnabled,
} from "@/lib/ai/provider-router";
import OpenAI, { toFile } from "openai";
import type {
  OneImageProviderInput,
  OneImageProviderResult,
} from "@/lib/ai/providers/types";
import {
  buildProviderTestImagePrompt,
  normalizeProviderTestPromptVersion,
  summarizeProviderTestPrompt,
} from "@/lib/prompts/provider-test-image-prompt";

export function getOpenAiProvider() {
  return {
    id: "openai" as const,
    generateOneTestImage: generateOpenAiProviderTestImage,
  };
}

export async function generateOpenAiProviderTestImage(
  input: OneImageProviderInput,
): Promise<OneImageProviderResult> {
  if (!isPaidImageGenerationEnabled()) {
    throw new Error("OpenAI test generation is blocked because ENABLE_PAID_IMAGE_GENERATION is false.");
  }

  const missingKey = getMissingProviderKey("openai");
  if (missingKey) {
    throw new Error(`${missingKey} is required before OpenAI test generation can run.`);
  }

  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const promptVersion = normalizeProviderTestPromptVersion(input.promptVersion);
  const prompt = buildProviderTestImagePrompt({ ...input, promptVersion });
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = input.referenceImage
    ? await client.images.edit({
        model,
        image: await imageInputToFile(input.referenceImage),
        prompt,
        n: 1,
        size: "1024x1536",
        quality: "low",
      })
    : await client.images.generate({
        model,
        prompt,
        n: 1,
        size: "1024x1536",
        quality: "low",
      });

  const image = response.data?.[0];
  const b64 = image?.b64_json;
  const url = image?.url;
  if (!b64 && !url) {
    throw new Error("OpenAI returned no image data for the one-image provider test.");
  }

  return {
    imageUrlOrBase64: b64 ? `data:image/png;base64,${b64}` : String(url),
    metadata: {
      provider: "openai",
      mode: "real",
      model,
      promptVersion,
      promptUsed: prompt,
      promptSummary: summarizeProviderTestPrompt(input),
      referenceImageUsed: Boolean(input.referenceImage),
      warnings: [
        "OpenAI one-image provider test ran only through the developer test lab.",
        "Check OpenAI dashboard usage for actual billing.",
      ],
    },
  };
}

async function imageInputToFile(image: NonNullable<OneImageProviderInput["referenceImage"]>) {
  const base64 = image.dataUrl.split(",")[1];
  if (!base64) {
    throw new Error("Reference image data is invalid.");
  }
  const extension = image.mimeType === "image/png"
    ? "png"
    : image.mimeType === "image/webp"
      ? "webp"
      : "jpg";
  return toFile(Buffer.from(base64, "base64"), `styletrip-reference.${extension}`, {
    type: image.mimeType,
  });
}

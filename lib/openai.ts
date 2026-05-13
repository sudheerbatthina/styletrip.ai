import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return client;
}

export function getTextModel() {
  // Change OPENAI_TEXT_MODEL in .env.local to switch analysis/planning models.
  const model = process.env.OPENAI_TEXT_MODEL;
  if (!model) {
    throw new Error("OPENAI_TEXT_MODEL is not configured.");
  }
  return model;
}

export function getImageModel() {
  // Change OPENAI_IMAGE_MODEL in .env.local to switch image generation models.
  const model = process.env.OPENAI_IMAGE_MODEL;
  if (!model) {
    throw new Error("OPENAI_IMAGE_MODEL is not configured.");
  }
  return model;
}

export function isMockMode() {
  return process.env.NEXT_PUBLIC_MOCK_MODE === "true";
}

import { NextResponse } from "next/server";
import { getOpenAIClient, getTextModel, isMockMode } from "@/lib/openai";
import { buildStyleAnalysisPrompt } from "@/lib/prompts/style-analysis";
import { analyzePhotoRequestSchema, analysisSchema } from "@/lib/schemas";
import { mockAnalysis } from "@/lib/mock-data";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = analyzePhotoRequestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Invalid request.");
    }

    if (isMockMode()) {
      return NextResponse.json(mockAnalysis);
    }

    const { image, preferences } = parsed.data;
    const client = getOpenAIClient();

    const completion = await client.chat.completions.create({
      model: getTextModel(),
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildStyleAnalysisPrompt(preferences) },
            {
              type: "image_url",
              image_url: {
                url: image.dataUrl,
                detail: "low",
              },
            },
          ],
        },
      ],
    } as never);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return jsonError("The analysis model returned no content.", 502);
    }

    const analysis = analysisSchema.parse(JSON.parse(content));
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("analyze-photo failed", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to analyze photo.",
      500,
    );
  }
}

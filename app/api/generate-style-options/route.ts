import { NextResponse } from "next/server";
import { getOpenAIClient, getTextModel, isMockMode } from "@/lib/openai";
import { buildStyleOptionsPrompt } from "@/lib/prompts/style-options";
import {
  styleOptionsRequestSchema,
  styleOptionsResponseSchema,
} from "@/lib/schemas";
import { mockStyleCards } from "@/lib/mock-data";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = styleOptionsRequestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Invalid request.");
    }

    if (isMockMode()) {
      return NextResponse.json({ styles: mockStyleCards });
    }

    const { analysis, preferences } = parsed.data;
    const client = getOpenAIClient();

    const completion = await client.chat.completions.create({
      model: getTextModel(),
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: buildStyleOptionsPrompt(analysis, preferences),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return jsonError("The style model returned no content.", 502);
    }

    const raw = JSON.parse(content) as unknown;
    const normalized =
      typeof raw === "object" && raw && "styles" in raw
        ? raw
        : { styles: raw };
    const styles = styleOptionsResponseSchema.parse(normalized);

    return NextResponse.json(styles);
  } catch (error) {
    console.error("generate-style-options failed", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to generate styles.",
      500,
    );
  }
}

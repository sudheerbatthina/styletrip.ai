import { NextResponse } from "next/server";
import { getTextProviderId, isMockMode } from "@/lib/ai/provider-router";
import {
  styleOptionsRequestSchema,
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

    const textProvider = getTextProviderId();
    if (isMockMode() || textProvider === "mock") {
      return NextResponse.json({ styles: mockStyleCards });
    }

    return jsonError(
      `${textProvider} style option provider is not enabled yet. Use NEXT_PUBLIC_MOCK_MODE=true or AI_TEXT_PROVIDER=mock for local testing.`,
      501,
    );
  } catch (error) {
    console.error("generate-style-options failed", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to generate styles.",
      500,
    );
  }
}
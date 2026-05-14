import { NextResponse } from "next/server";
import { getReferenceLooksForPlan } from "@/lib/reference/reference-provider";
import {
  referenceLooksRequestSchema,
  referenceLooksResponseSchema,
} from "@/lib/schemas";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = referenceLooksRequestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "Invalid request.");
    }

    const result = getReferenceLooksForPlan(parsed.data);
    return NextResponse.json(referenceLooksResponseSchema.parse(result));
  } catch (error) {
    console.error("generate-reference-looks failed", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to generate reference looks.",
      500,
    );
  }
}

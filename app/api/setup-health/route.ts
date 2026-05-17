import { NextResponse } from "next/server";
import { getSetupHealth } from "@/lib/setup/setup-health";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getSetupHealth());
  } catch (error) {
    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        summary: {
          safeToTestOneRealImage: false,
          message: "Setup Health could not complete. Check server logs and environment configuration.",
          missingSteps: [
            error instanceof Error ? error.message : "Unknown setup health error.",
          ],
        },
        environment: [],
        auth: [],
        storage: [],
        tables: [],
        migrations: [],
        providers: [],
        guards: [],
      },
      { status: 200 },
    );
  }
}

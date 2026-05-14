import type { MatchScoringInput } from "@/lib/matching/match-scorer";
import type { ReferenceLook } from "@/lib/schemas";

export async function scoreReferenceLooksWithAi(
  _input: MatchScoringInput,
): Promise<ReferenceLook[]> {
  // TODO: Add AI scoring provider when real model matching is enabled.
  // This must remain side-effect free in mock mode and should not call paid APIs
  // until explicit provider configuration and cost confirmation UX are added.
  throw new Error("AI match scoring is not enabled yet.");
}

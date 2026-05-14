import type { Preferences, ReferenceLook, StyleAnalysis } from "@/lib/schemas";

export type MatchScoringInput = {
  looks: ReferenceLook[];
  analysis: StyleAnalysis;
  preferences: Preferences;
};

export type MatchScorer = (input: MatchScoringInput) => ReferenceLook[];

export function sortLooksByMatch(looks: ReferenceLook[]) {
  return [...looks].sort((a, b) => b.overallMatchScore - a.overallMatchScore);
}

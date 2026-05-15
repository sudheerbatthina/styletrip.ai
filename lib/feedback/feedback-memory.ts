import type { FeedbackType, ReferenceLook, StyleMemorySummary } from "@/lib/schemas";

export type PersistedStyleFeedbackRow = {
  reference_look_id: string;
  feedback_type: FeedbackType;
  look_title: string | null;
  occasion: string | null;
  fit: string | null;
  color_mood: string | null;
  items: string[] | null;
  score_snapshot: Record<string, unknown> | null;
  created_at: string | null;
};

export type MemoryScoreBreakdown = {
  baseScore: number;
  feedbackBoost: number;
  feedbackPenalty: number;
  finalScore: number;
  reasons: string[];
};

const positiveFeedbackTypes: FeedbackType[] = [
  "selected",
  "generated",
  "saved",
  "downloaded",
];

export const emptyStyleMemory: StyleMemorySummary = {
  likedTitles: [],
  dislikedTitles: [],
  likedColors: [],
  dislikedColors: [],
  likedFits: [],
  dislikedFits: [],
  likedOccasions: [],
  dislikedOccasions: [],
  selectedCount: 0,
  rejectedCount: 0,
  savedCount: 0,
  downloadedCount: 0,
};

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function compact(value: string | null | undefined) {
  return (value ?? "").trim();
}

function uniqueRecent(values: string[], limit = 8) {
  return Array.from(new Set(values.map(compact).filter(Boolean))).slice(0, limit);
}

function splitColors(value: string | null) {
  return (value ?? "")
    .split(/[\/,;&]+|\band\b/gi)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isPositiveFeedback(type: FeedbackType) {
  return positiveFeedbackTypes.includes(type);
}

function overlaps(lookText: string, values: string[]) {
  return values.filter((value) => {
    const normalized = normalize(value);
    if (normalized.length < 3) {
      return false;
    }
    return lookText.includes(normalized);
  });
}

export function buildStyleMemorySummary(
  rows: PersistedStyleFeedbackRow[],
): StyleMemorySummary {
  const likedRows = rows.filter((row) => isPositiveFeedback(row.feedback_type));
  const dislikedRows = rows.filter((row) => row.feedback_type === "not_my_style");

  return {
    likedTitles: uniqueRecent(likedRows.map((row) => row.look_title ?? "")),
    dislikedTitles: uniqueRecent(dislikedRows.map((row) => row.look_title ?? "")),
    likedColors: uniqueRecent(likedRows.flatMap((row) => splitColors(row.color_mood))),
    dislikedColors: uniqueRecent(dislikedRows.flatMap((row) => splitColors(row.color_mood))),
    likedFits: uniqueRecent(likedRows.map((row) => row.fit ?? "")),
    dislikedFits: uniqueRecent(dislikedRows.map((row) => row.fit ?? "")),
    likedOccasions: uniqueRecent(likedRows.map((row) => row.occasion ?? "")),
    dislikedOccasions: uniqueRecent(dislikedRows.map((row) => row.occasion ?? "")),
    selectedCount: rows.filter((row) => row.feedback_type === "selected").length,
    rejectedCount: dislikedRows.length,
    savedCount: rows.filter((row) => row.feedback_type === "saved").length,
    downloadedCount: rows.filter((row) => row.feedback_type === "downloaded").length,
  };
}

export function scoreLookWithStyleMemory(
  look: ReferenceLook,
  memory: StyleMemorySummary = emptyStyleMemory,
): MemoryScoreBreakdown {
  const lookText = normalize(
    `${look.title} ${look.occasion} ${look.fit} ${look.colorMood} ${look.items.join(" ")} ${look.promptHint}`,
  );
  const likedTitleMatches = overlaps(lookText, memory.likedTitles);
  const dislikedTitleMatches = overlaps(lookText, memory.dislikedTitles);
  const likedColorMatches = overlaps(lookText, memory.likedColors);
  const dislikedColorMatches = overlaps(lookText, memory.dislikedColors);
  const likedFitMatches = overlaps(lookText, memory.likedFits);
  const dislikedFitMatches = overlaps(lookText, memory.dislikedFits);
  const likedOccasionMatches = overlaps(lookText, memory.likedOccasions);
  const dislikedOccasionMatches = overlaps(lookText, memory.dislikedOccasions);

  const feedbackBoost = Math.min(
    24,
    likedTitleMatches.length * 8 +
      likedColorMatches.length * 4 +
      likedFitMatches.length * 5 +
      likedOccasionMatches.length * 4,
  );
  const feedbackPenalty = Math.min(
    36,
    dislikedTitleMatches.length * 12 +
      dislikedColorMatches.length * 5 +
      dislikedFitMatches.length * 6 +
      dislikedOccasionMatches.length * 5,
  );
  const finalScore = Math.max(
    0,
    Math.min(100, Math.round(look.overallMatchScore + feedbackBoost - feedbackPenalty)),
  );
  const reasons = [
    likedTitleMatches.length > 0 ? "Similar to looks you selected or saved." : "",
    likedColorMatches.length > 0 ? "Uses colors you tend to like." : "",
    likedFitMatches.length > 0 ? "Matches fits you have responded to well." : "",
    dislikedTitleMatches.length > 0 ? "Similar to styles you rejected." : "",
    dislikedColorMatches.length > 0 ? "Uses colors you have downranked." : "",
    dislikedFitMatches.length > 0 ? "Matches fits you have rejected." : "",
  ].filter(Boolean);

  return {
    baseScore: Math.round(look.overallMatchScore),
    feedbackBoost,
    feedbackPenalty,
    finalScore,
    reasons,
  };
}

export function applyStyleMemoryToReferenceLooks(
  looks: ReferenceLook[],
  memory: StyleMemorySummary = emptyStyleMemory,
) {
  return looks
    .map((look) => {
      const memoryScore = scoreLookWithStyleMemory(look, memory);
      return {
        ...look,
        overallMatchScore: memoryScore.finalScore,
        preferenceScore: Math.max(
          0,
          Math.min(100, look.preferenceScore + memoryScore.feedbackBoost - memoryScore.feedbackPenalty),
        ),
        whyThisMatches:
          memoryScore.reasons.length > 0
            ? [...memoryScore.reasons.slice(0, 2), ...look.whyThisMatches]
            : look.whyThisMatches,
        matchTags:
          memoryScore.feedbackBoost > memoryScore.feedbackPenalty
            ? Array.from(new Set(["style memory", ...look.matchTags])).slice(0, 4)
            : look.matchTags,
      };
    })
    .sort((a, b) => b.overallMatchScore - a.overallMatchScore);
}

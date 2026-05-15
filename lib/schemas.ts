import { z } from "zod";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const aspectRatioSchema = z.enum(["1:1", "4:5", "16:9"]);
export const resemblanceModeSchema = z.enum([
  "strong",
  "balanced",
  "loose",
]);

export const feedbackTypeSchema = z.enum([
  "selected",
  "deselected",
  "not_my_style",
  "generated",
  "saved",
  "downloaded",
]);

export const referenceFeedbackSchema = z.object({
  selected: z.array(z.string()).default([]),
  deselected: z.array(z.string()).default([]),
  notMyStyle: z.array(z.string()).default([]),
  generated: z.array(z.string()).default([]),
  saved: z.array(z.string()).default([]),
  downloaded: z.array(z.string()).default([]),
  refreshCount: z.coerce.number().int().min(0).default(0),
}).default({});

export const styleMemorySummarySchema = z.object({
  likedTitles: z.array(z.string()).default([]),
  dislikedTitles: z.array(z.string()).default([]),
  likedColors: z.array(z.string()).default([]),
  dislikedColors: z.array(z.string()).default([]),
  likedFits: z.array(z.string()).default([]),
  dislikedFits: z.array(z.string()).default([]),
  likedOccasions: z.array(z.string()).default([]),
  dislikedOccasions: z.array(z.string()).default([]),
  selectedCount: z.number().int().min(0).default(0),
  rejectedCount: z.number().int().min(0).default(0),
  savedCount: z.number().int().min(0).default(0),
  downloadedCount: z.number().int().min(0).default(0),
}).default({});

export const imageInputSchema = z.object({
  dataUrl: z.string().min(100, "Image data is required."),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
}).refine(
  (image) => {
    const base64Length = image.dataUrl.split(",")[1]?.length ?? image.dataUrl.length;
    return Math.ceil((base64Length * 3) / 4) <= MAX_UPLOAD_BYTES;
  },
  { message: "Images must be 8 MB or smaller." },
);

export const preferencesSchema = z.object({
  height: z.string().optional().default(""),
  tripLocation: z.string().min(1).default("Las Vegas"),
  tripType: z.string().min(1).default("vacation"),
  genderStyleDirection: z.string().optional().default("men's vacation style"),
  budgetRange: z.string().optional().default("mid-range"),
  preferredFit: z
    .enum(["slim", "regular", "relaxed", "oversized"])
    .default("relaxed"),
  dislikedStyles: z.string().optional().default(""),
  favoriteColors: z.string().optional().default(""),
  occasionTypes: z.array(z.string()).default(["daytime walking", "dinner"]),
  aspectRatio: aspectRatioSchema.default("1:1"),
  numberOfStyleIdeas: z.coerce.number().int().min(4).max(16).default(12),
  usePhotoReferenceConsent: z.boolean().default(false),
  resemblanceMode: resemblanceModeSchema.default("strong"),
  referenceFeedback: referenceFeedbackSchema.optional(),
  styleMemory: styleMemorySummarySchema.optional(),
});

export const visibleStyleProfileSchema = z.object({
  bodyFrame: z.string(),
  proportionNotes: z.string(),
  skinToneStylingNotes: z.string(),
  currentOutfitNotes: z.string(),
  fitAdvice: z.array(z.string()),
  avoidAdvice: z.array(z.string()),
});

export const analysisSchema = z.object({
  visibleStyleProfile: visibleStyleProfileSchema,
  recommendedColorPalette: z.array(z.string()),
  recommendedSilhouettes: z.array(z.string()),
  confidenceNotes: z.string(),
});

export const styleCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  vibe: z.string(),
  bestFor: z.string(),
  whyItFitsUser: z.string(),
  items: z.array(z.string()),
  colors: z.array(z.string()),
  footwear: z.array(z.string()),
  accessories: z.array(z.string()),
  avoidIf: z.string(),
  imagePromptHint: z.string(),
});

export const internalStylePlanSchema = z.object({
  stylePlanId: z.string(),
  occasionFocus: z.array(z.string()),
  recommendedDirections: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      reason: z.string(),
      colors: z.array(z.string()),
      silhouettes: z.array(z.string()),
      avoid: z.array(z.string()),
      occasion: z.string(),
    }),
  ),
  overallGuidance: z.string(),
});

export const matchScoreSchema = z.number().int().min(0).max(100);

export const referenceLookSchema = z.object({
  id: z.string(),
  title: z.string(),
  occasion: z.string(),
  fit: z.string(),
  colorMood: z.string(),
  items: z.array(z.string()),
  whyItFits: z.string(),
  referenceImageUrl: z.string().min(20),
  source: z.enum(["mock", "curated", "stock", "catalog", "pexels", "unsplash"]),
  sourceUrl: z.string().nullable(),
  sourceName: z.string().optional().default(""),
  photographer: z.string().optional().default(""),
  photographerUrl: z.string().nullable().optional().default(null),
  attributionText: z.string().optional().default(""),
  promptHint: z.string(),
  selected: z.boolean().default(false),
  overallMatchScore: matchScoreSchema.default(0),
  bodyFitScore: matchScoreSchema.default(0),
  colorScore: matchScoreSchema.default(0),
  occasionScore: matchScoreSchema.default(0),
  preferenceScore: matchScoreSchema.default(0),
  whyThisMatches: z.array(z.string()).default([]),
  matchTags: z.array(z.string()).default([]),
});

export const selectableStyleSchema = z.union([referenceLookSchema, styleCardSchema]);

export const styleOptionsResponseSchema = z.object({
  styles: z.array(styleCardSchema).length(24),
});

export const referenceLooksRequestSchema = z.object({
  analysis: analysisSchema,
  preferences: preferencesSchema,
});

export const referenceLooksResponseSchema = z.object({
  stylePlan: internalStylePlanSchema,
  referenceLooks: z.array(referenceLookSchema).min(4).max(24),
});

export const outfitImageSchema = z.object({
  styleId: z.string(),
  image: z.string().min(20),
  promptUsed: z.string().optional(),
});

export const outfitImagesResponseSchema = z.object({
  outfitImages: z.array(outfitImageSchema).min(4).max(16),
});

export const analyzePhotoRequestSchema = z.object({
  image: imageInputSchema,
  preferences: preferencesSchema,
});

export const styleOptionsRequestSchema = z.object({
  analysis: analysisSchema,
  preferences: preferencesSchema,
});

export const boardRequestSchema = z.object({
  image: imageInputSchema,
  analysis: analysisSchema,
  selectedStyles: z.array(selectableStyleSchema).min(4).max(16),
  preferences: preferencesSchema,
  aspectRatio: aspectRatioSchema.default("1:1"),
});

export const refineBoardRequestSchema = boardRequestSchema.extend({
  editInstruction: z.string().min(3).max(240),
});

export const outfitImagesRequestSchema = boardRequestSchema.extend({
  editInstruction: z.string().min(3).max(240).optional(),
});

export const saveBoardRequestSchema = z.object({
  image: imageInputSchema,
  boardImage: z.string().min(20),
  outfitImages: z.array(outfitImageSchema).min(4).max(16),
  analysis: analysisSchema,
  selectedStyles: z.array(selectableStyleSchema).min(4).max(16),
  preferences: preferencesSchema,
  title: z.string().min(1).max(120).optional(),
});

export const styleFeedbackRequestSchema = z.object({
  boardId: z.string().uuid().nullable().optional(),
  referenceLookId: z.string().min(1),
  feedbackType: feedbackTypeSchema,
  lookTitle: z.string().min(1).max(160),
  occasion: z.string().optional().default(""),
  fit: z.string().optional().default(""),
  colorMood: z.string().optional().default(""),
  items: z.array(z.string()).default([]),
  scoreSnapshot: z.record(z.unknown()).optional().default({}),
});

export type Preferences = z.infer<typeof preferencesSchema>;
export type ImageInput = z.infer<typeof imageInputSchema>;
export type StyleAnalysis = z.infer<typeof analysisSchema>;
export type StyleCardData = z.infer<typeof styleCardSchema>;
export type InternalStylePlan = z.infer<typeof internalStylePlanSchema>;
export type ReferenceLook = z.infer<typeof referenceLookSchema>;
export type ReferenceFeedback = z.infer<typeof referenceFeedbackSchema>;
export type StyleMemorySummary = z.infer<typeof styleMemorySummarySchema>;
export type FeedbackType = z.infer<typeof feedbackTypeSchema>;
export type SelectableStyle = z.infer<typeof selectableStyleSchema>;
export type StyleOptionsResponse = z.infer<typeof styleOptionsResponseSchema>;
export type ReferenceLooksResponse = z.infer<typeof referenceLooksResponseSchema>;
export type OutfitImage = z.infer<typeof outfitImageSchema>;
export type OutfitImagesResponse = z.infer<typeof outfitImagesResponseSchema>;
export type BoardRequest = z.infer<typeof boardRequestSchema>;
export type SaveBoardRequest = z.infer<typeof saveBoardRequestSchema>;
export type StyleFeedbackRequest = z.infer<typeof styleFeedbackRequestSchema>;
export type AspectRatio = z.infer<typeof aspectRatioSchema>;
export type ResemblanceMode = z.infer<typeof resemblanceModeSchema>;





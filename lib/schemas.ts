import { z } from "zod";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const aspectRatioSchema = z.enum(["1:1", "4:5", "16:9"]);
export const resemblanceModeSchema = z.enum([
  "strong",
  "balanced",
  "loose",
]);

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

export const styleOptionsResponseSchema = z.object({
  styles: z.array(styleCardSchema).length(24),
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
  selectedStyles: z.array(styleCardSchema).min(4).max(16),
  preferences: preferencesSchema,
  aspectRatio: z.string().default("1:1"),
});

export const refineBoardRequestSchema = boardRequestSchema.extend({
  editInstruction: z.string().min(3).max(240),
});

export const saveBoardRequestSchema = z.object({
  image: imageInputSchema,
  boardImage: z.string().min(20),
  analysis: analysisSchema,
  selectedStyles: z.array(styleCardSchema).min(4).max(16),
  preferences: preferencesSchema,
  title: z.string().min(1).max(120).optional(),
});

export type Preferences = z.infer<typeof preferencesSchema>;
export type ImageInput = z.infer<typeof imageInputSchema>;
export type StyleAnalysis = z.infer<typeof analysisSchema>;
export type StyleCardData = z.infer<typeof styleCardSchema>;
export type StyleOptionsResponse = z.infer<typeof styleOptionsResponseSchema>;
export type BoardRequest = z.infer<typeof boardRequestSchema>;
export type SaveBoardRequest = z.infer<typeof saveBoardRequestSchema>;
export type AspectRatio = z.infer<typeof aspectRatioSchema>;
export type ResemblanceMode = z.infer<typeof resemblanceModeSchema>;

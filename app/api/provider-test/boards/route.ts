import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { referenceLookSchema, type Preferences, type ReferenceLook, type SelectableStyle, type StyleAnalysis } from "@/lib/schemas";
import { storageBuckets } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

type SavedProviderTestBoardRow = {
  id: string;
  title: string;
  trip_location: string | null;
  trip_type: string | null;
  aspect_ratio: string | null;
  source_photo_id: string | null;
  analysis_json: StyleAnalysis | null;
  preferences_json: Preferences | null;
  selected_styles_json: SelectableStyle[] | null;
  created_at: string;
};

export async function GET() {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return NextResponse.json({ boards: [], available: false, reason: "Sign in to load saved boards." });
  }

  const { data, error } = await supabase
    .from("boards")
    .select("id, title, trip_location, trip_type, aspect_ratio, source_photo_id, analysis_json, preferences_json, selected_styles_json, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ boards: [], available: false, reason: error.message }, { status: 200 });
  }

  const boards = await Promise.all(
    ((data ?? []) as SavedProviderTestBoardRow[]).map(async (board) => {
      const sourcePhotoUrl = board.source_photo_id
        ? await getSourcePhotoUrl(board.source_photo_id, supabase, user.id)
        : null;
      const referenceLooks = (board.selected_styles_json ?? []).flatMap((style) => {
        const parsed = referenceLookSchema.safeParse(style);
        return parsed.success ? [parsed.data] : [];
      });

      return {
        id: board.id,
        title: board.title,
        tripLocation: board.trip_location,
        tripType: board.trip_type,
        aspectRatio: board.aspect_ratio,
        sourcePhotoId: board.source_photo_id,
        sourcePhotoUrl,
        selectedReferenceLooks: referenceLooks,
        analysisSummary: buildAnalysisSummary(board.analysis_json, board.preferences_json),
        createdAt: board.created_at,
      };
    }),
  );

  return NextResponse.json({ boards, available: true, reason: null });

  async function getSourcePhotoUrl(photoId: string, client: SupabaseClient, userId: string) {
    const { data: photo } = await client
      .from("user_photos")
      .select("image_path")
      .eq("id", photoId)
      .eq("user_id", userId)
      .single();

    if (!photo?.image_path) {
      return null;
    }

    const { data: signed } = await client.storage
      .from(storageBuckets.userPhotos)
      .createSignedUrl(photo.image_path, 60 * 30);
    return signed?.signedUrl ?? null;
  }
}

function buildAnalysisSummary(analysis: StyleAnalysis | null, preferences: Preferences | null) {
  const parts = [
    preferences?.tripLocation ? `Trip: ${preferences.tripLocation}` : "",
    preferences?.tripType ? `Trip type: ${preferences.tripType}` : "",
    preferences?.preferredFit ? `Preferred fit: ${preferences.preferredFit}` : "",
    preferences?.occasionTypes?.length ? `Occasions: ${preferences.occasionTypes.join(", ")}` : "",
    analysis?.recommendedColorPalette?.length ? `Palette: ${analysis.recommendedColorPalette.join(", ")}` : "",
    analysis?.recommendedSilhouettes?.length ? `Silhouettes: ${analysis.recommendedSilhouettes.join("; ")}` : "",
    analysis?.visibleStyleProfile?.fitAdvice?.length ? `Fit advice: ${analysis.visibleStyleProfile.fitAdvice.join(" ")}` : "",
  ].filter(Boolean);

  return parts.join("\n").slice(0, 1000);
}
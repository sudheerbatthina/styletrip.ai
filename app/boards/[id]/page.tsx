import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppNav } from "@/components/common/AppNav";
import { SavedBoardDetail } from "@/components/dashboard/SavedBoardDetail";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type {
  OutfitImage,
  Preferences,
  StyleAnalysis,
  SelectableStyle,
} from "@/lib/schemas";
import { isSupabaseConfigured, storageBuckets } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

type BoardDetail = {
  id: string;
  title: string;
  trip_location: string | null;
  trip_type: string | null;
  aspect_ratio: string | null;
  number_of_styles: number | null;
  analysis_json: StyleAnalysis | null;
  preferences_json: Preferences | null;
  selected_styles_json: SelectableStyle[] | null;
  created_at: string;
};

function getSavedMatchScore(style: SelectableStyle) {
  if (!("referenceImageUrl" in style) || style.overallMatchScore <= 0) {
    return null;
  }
  return Math.round(style.overallMatchScore);
}
function getAverageMatchScore(styles: SelectableStyle[]) {
  const scores = styles
    .map((style) => ("referenceImageUrl" in style ? style.overallMatchScore : 0))
    .filter((score) => score > 0);

  if (scores.length === 0) {
    return null;
  }

  return Math.round(scores.reduce((total, score) => total + score, 0) / scores.length);
}
export const dynamic = "force-dynamic";

export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    redirect("/login");
  }

  const { data: board, error } = await supabase
    .from("boards")
    .select(
      "id, title, trip_location, trip_type, aspect_ratio, number_of_styles, analysis_json, preferences_json, selected_styles_json, created_at",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !board) {
    notFound();
  }

  const typedBoard = board as BoardDetail;
  const selectedStyles = typedBoard.selected_styles_json ?? [];
  const palette = typedBoard.analysis_json?.recommendedColorPalette ?? [];
  const averageMatchScore = getAverageMatchScore(selectedStyles);
  const { data: boardImages } = await supabase
    .from("board_images")
    .select("style_key, storage_path")
    .eq("board_id", id)
    .eq("user_id", user.id)
    .eq("image_type", "outfit");

  const outfitImages: OutfitImage[] = await Promise.all(
    (boardImages ?? []).map(async (image) => {
      const { data } = await supabase.storage
        .from(storageBuckets.generatedOutfits)
        .createSignedUrl(image.storage_path, 60 * 30);
      return {
        styleId: image.style_key ?? "",
        image: data?.signedUrl ?? "",
      };
    }),
  );

  return (
    <>
      <AppNav />
      <main className="container space-y-6 py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/dashboard" className="text-sm font-semibold text-primary">
              Back to dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-bold tracking-normal">
              {typedBoard.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {typedBoard.trip_location ?? "Trip"} / {typedBoard.trip_type ?? "style"} /{" "}
              {new Date(typedBoard.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {typedBoard.analysis_json && typedBoard.preferences_json ? (
          <SavedBoardDetail
            boardId={typedBoard.id}
            analysis={typedBoard.analysis_json}
            preferences={typedBoard.preferences_json}
            selectedStyles={selectedStyles}
            outfitImages={outfitImages}
          />
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4 lg:col-start-2">
            <Card>
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-semibold">Board details</p>
                <div className="flex flex-wrap gap-2">
                  <Badge>{typedBoard.aspect_ratio ?? "1:1"}</Badge>
                  <Badge>{typedBoard.number_of_styles ?? selectedStyles.length} looks</Badge>
                  {averageMatchScore ? <Badge>{averageMatchScore}% avg match</Badge> : null}
                  <Badge>
                    {typedBoard.preferences_json?.resemblanceMode ?? "strong"} resemblance
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {palette.length > 0 ? (
              <Card>
                <CardContent className="space-y-3 p-4">
                  <p className="text-sm font-semibold">Recommended colors</p>
                  <div className="flex flex-wrap gap-2">
                    {palette.map((color) => (
                      <Badge key={color}>{color}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-semibold">Selected reference looks</p>
                <div className="space-y-3">
                  {selectedStyles.map((style, index) => {
                    const matchScore = getSavedMatchScore(style);

                    return (
                      <div key={style.id} className="rounded-md border bg-muted/35 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold">
                            {index + 1}. {style.title}
                          </p>
                          {matchScore ? <Badge>{matchScore}% match</Badge> : null}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {style.items.join(", ")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}


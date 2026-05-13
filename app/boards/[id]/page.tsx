import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { Download, ShoppingBag } from "lucide-react";
import { AppNav } from "@/components/common/AppNav";
import { DeleteBoardButton } from "@/components/dashboard/DeleteBoardButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Preferences, StyleAnalysis, StyleCardData } from "@/lib/schemas";
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
  selected_styles_json: StyleCardData[] | null;
  final_board_image_path: string | null;
  created_at: string;
};

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
      "id, title, trip_location, trip_type, aspect_ratio, number_of_styles, analysis_json, preferences_json, selected_styles_json, final_board_image_path, created_at",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !board) {
    notFound();
  }

  const typedBoard = board as BoardDetail;
  const signedUrl = typedBoard.final_board_image_path
    ? (
        await supabase.storage
          .from(storageBuckets.generatedBoards)
          .createSignedUrl(typedBoard.final_board_image_path, 60 * 30)
      ).data?.signedUrl
    : null;

  const selectedStyles = typedBoard.selected_styles_json ?? [];
  const palette = typedBoard.analysis_json?.recommendedColorPalette ?? [];

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
              {typedBoard.trip_location ?? "Trip"} · {typedBoard.trip_type ?? "style"} ·{" "}
              {new Date(typedBoard.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {signedUrl ? (
              <Button asChildLike="link" href={signedUrl}>
                <Download className="h-4 w-4" />
                Download
              </Button>
            ) : null}
            <Button variant="secondary" disabled title="Coming soon">
              <ShoppingBag className="h-4 w-4" />
              Generate shopping links
            </Button>
            <DeleteBoardButton boardId={typedBoard.id} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardContent className="p-4">
              <div className="overflow-hidden rounded-lg border bg-muted">
                {signedUrl ? (
                  <Image
                    src={signedUrl}
                    alt={`${typedBoard.title} generated board`}
                    width={1200}
                    height={1200}
                    unoptimized
                    className="h-auto w-full"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center text-sm text-muted-foreground">
                    Board image unavailable
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-semibold">Board details</p>
                <div className="flex flex-wrap gap-2">
                  <Badge>{typedBoard.aspect_ratio ?? "1:1"}</Badge>
                  <Badge>{typedBoard.number_of_styles ?? selectedStyles.length} styles</Badge>
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
                <p className="text-sm font-semibold">Selected styles</p>
                <div className="space-y-3">
                  {selectedStyles.map((style, index) => (
                    <div key={style.id} className="rounded-md border bg-muted/35 p-3">
                      <p className="text-sm font-bold">
                        {index + 1}. {style.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {style.items.join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}

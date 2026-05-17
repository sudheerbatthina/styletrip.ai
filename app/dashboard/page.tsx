import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Calendar, MapPin, Plus } from "lucide-react";
import { AppNav } from "@/components/common/AppNav";
import { ConfigWarning } from "@/components/common/ConfigWarning";
import { ProviderStatusCard } from "@/components/dashboard/ProviderStatusCard";
import { ProviderTestLabCard } from "@/components/dashboard/ProviderTestLabCard";
import { SetupHealthCard } from "@/components/dashboard/SetupHealthCard";
import { StyleMemoryCard } from "@/components/dashboard/StyleMemoryCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SelectableStyle } from "@/lib/schemas";
import { isPromptLabVisible } from "@/lib/ai/provider-router";
import { isSupabaseConfigured, storageBuckets } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

type BoardListItem = {
  id: string;
  title: string;
  trip_location: string | null;
  trip_type: string | null;
  aspect_ratio: string | null;
  number_of_styles: number | null;
  final_board_image_path: string | null;
  selected_styles_json: SelectableStyle[] | null;
  created_at: string;
};

function getAverageMatchScore(styles: SelectableStyle[] | null) {
  const scores = (styles ?? [])
    .map((style) => ("referenceImageUrl" in style ? style.overallMatchScore : 0))
    .filter((score) => score > 0);

  if (scores.length === 0) {
    return null;
  }

  return Math.round(scores.reduce((total, score) => total + score, 0) / scores.length);
}
export const dynamic = "force-dynamic";

const showProviderTestLab =
  process.env.NODE_ENV === "development" ||
  process.env.SHOW_PROVIDER_TEST_LAB === "true";

export default async function DashboardPage() {
  const supabaseReady = isSupabaseConfigured();
  const { supabase, user } = await getCurrentUser();

  if (!supabaseReady) {
    return (
      <>
        <AppNav />
        <main className="container space-y-6 py-8">
          <ConfigWarning>
            Supabase is not configured. Add Supabase env vars to enable auth and
            saved boards. You can still test generation from `/boards/new`.
          </ConfigWarning>
          <Button asChildLike="link" href="/boards/new">
            Try Builder
          </Button>
        </main>
      </>
    );
  }

  if (!user || !supabase) {
    redirect("/login");
  }

  const { data: boards } = await supabase
    .from("boards")
    .select(
      "id, title, trip_location, trip_type, aspect_ratio, number_of_styles, final_board_image_path, selected_styles_json, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const boardsWithImages = await Promise.all(
    ((boards ?? []) as BoardListItem[]).map(async (board) => {
      if (!board.final_board_image_path) {
        return { ...board, imageUrl: null, averageMatchScore: getAverageMatchScore(board.selected_styles_json) };
      }
      const { data } = await supabase.storage
        .from(storageBuckets.generatedBoards)
        .createSignedUrl(board.final_board_image_path, 60 * 20);
      return {
        ...board,
        imageUrl: data?.signedUrl ?? null,
        averageMatchScore: getAverageMatchScore(board.selected_styles_json),
      };
    }),
  );

  return (
    <>
      <AppNav />
      <main className="container space-y-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Dashboard</p>
            <h1 className="text-3xl font-bold tracking-normal">Saved boards</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Reopen, download, or delete your generated trip style boards.
            </p>
          </div>
          <Button asChildLike="link" href="/boards/new">
            <Plus className="h-4 w-4" />
            New Board
          </Button>
        </div>

        <StyleMemoryCard />
        <ProviderStatusCard />
        <SetupHealthCard compact />
        {isPromptLabVisible() ? (
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Prompt Lab</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Generate copyable ChatGPT-style prompts and import manual result images. No paid APIs are called.
                </p>
              </div>
              <Button asChildLike="link" href="/dashboard/prompt-lab" variant="outline">Open Prompt Lab</Button>
            </CardContent>
          </Card>
        ) : null}
        {showProviderTestLab ? <ProviderTestLabCard /> : null}

        {boardsWithImages.length === 0 ? (
          <Card>
            <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 p-8 text-center">
              <h2 className="text-xl font-bold">No saved boards yet</h2>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                Generate your first AI outfit inspiration board and save it here.
              </p>
              <Button asChildLike="link" href="/boards/new">
                Create Board
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boardsWithImages.map((board) => (
              <Link key={board.id} href={`/boards/${board.id}`} className="block">
                <Card className="h-full overflow-hidden transition hover:-translate-y-0.5 hover:border-primary/60">
                  <div className="aspect-square bg-[#f4ecdf]">
                    {board.imageUrl ? (
                      <Image
                        src={board.imageUrl}
                        alt={`${board.title} board`}
                        width={640}
                        height={640}
                        unoptimized
                        className="h-full w-full object-contain p-2"
                      />
                    ) : null}
                  </div>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge>{board.aspect_ratio ?? "1:1"}</Badge>
                      <Badge>{board.number_of_styles ?? 0} looks</Badge>
                      {board.averageMatchScore ? (
                        <Badge>{board.averageMatchScore}% avg match</Badge>
                      ) : null}
                    </div>
                    <h2 className="font-bold">{board.title}</h2>
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {board.trip_location ?? "Trip"} · {board.trip_type ?? "style"}
                    </p>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(board.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}



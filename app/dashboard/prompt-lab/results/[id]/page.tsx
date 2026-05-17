import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { AppNav } from "@/components/common/AppNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isPromptLabVisible } from "@/lib/ai/provider-router";
import { getManualPromptResult } from "@/lib/prompt-lab/manual-prompt-results";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ManualPromptResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isPromptLabVisible() || !isSupabaseConfigured()) {
    redirect("/dashboard");
  }

  const { user } = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const { result } = await getManualPromptResult(id);
  if (!result) {
    notFound();
  }

  const quality = isRecord(result.metadata?.quality) ? result.metadata.quality : null;

  return (
    <>
      <AppNav />
      <main className="container space-y-6 py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Button asChildLike="link" href="/dashboard/prompt-lab" variant="ghost" className="px-0">Back to Prompt Lab</Button>
            <h1 className="mt-3 text-3xl font-bold tracking-normal">Manual prompt result</h1>
            <p className="mt-2 text-sm text-muted-foreground">{new Date(result.createdAt).toLocaleString()}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{result.promptVersion ?? "prompt"}</Badge>
            <Badge>{result.source}</Badge>
            {result.boardTitle ? <Badge>{result.boardTitle}</Badge> : null}
            {result.metadata?.useAsInspiration ? <Badge>Inspiration</Badge> : null}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Card>
            <CardContent className="p-4">
              {result.importedImageUrl ? (
                <Image
                  src={result.importedImageUrl}
                  alt="Manual prompt import"
                  width={1200}
                  height={900}
                  unoptimized
                  className="max-h-[760px] w-full rounded-md border bg-muted object-contain p-2"
                />
              ) : (
                <div className="flex min-h-96 items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
                  Imported image is missing or no longer available.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-semibold">Linked context</p>
                {result.boardId ? <Button asChildLike="link" href={`/boards/${result.boardId}`} variant="outline" className="w-full">Open saved board</Button> : <p className="text-sm text-muted-foreground">No saved board linked.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-semibold">Quality checklist</p>
                {quality ? (
                  <pre className="overflow-auto rounded-md bg-muted p-3 text-xs leading-5">{JSON.stringify(quality, null, 2)}</pre>
                ) : (
                  <p className="text-sm text-muted-foreground">No quality checklist saved yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-semibold">Prompt used</p>
                {result.promptUsed ? <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs leading-5">{result.promptUsed}</pre> : <p className="text-sm text-muted-foreground">No prompt recorded.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-semibold">Safe metadata</p>
                <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs leading-5">{JSON.stringify(result.metadata ?? {}, null, 2)}</pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

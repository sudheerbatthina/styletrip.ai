import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppNav } from "@/components/common/AppNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProviderTestRun } from "@/lib/provider-test/provider-test-runs";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProviderTestRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/dashboard");
  }
  const { user } = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const { run, available } = await getProviderTestRun(id);
  if (!available || !run) {
    notFound();
  }

  const quality = getRecord(run.metadata?.quality);
  const setupHealth = getRecord(run.metadata?.setupHealth);
  const setupSummary = getRecord(setupHealth?.summary);

  return (
    <>
      <AppNav />
      <main className="container space-y-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/dashboard" className="text-sm font-semibold text-primary">
              Back to dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-bold tracking-normal">Provider test run</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {new Date(run.createdAt).toLocaleString()} / {run.provider} / {run.status}
            </p>
          </div>
          <Button asChildLike="link" href="/dashboard" variant="outline">
            Open Provider Lab
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap gap-2">
                <Badge>{run.provider}</Badge>
                <Badge>{run.status}</Badge>
                {run.model ? <Badge>{run.model}</Badge> : null}
                {run.promptVersion ? <Badge>{run.promptVersion}</Badge> : null}
                <Badge>{run.imageCount} image</Badge>
              </div>
              {run.outputImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={run.outputImageUrl}
                  alt="Provider test output"
                  className="max-h-[720px] w-full rounded-md border bg-muted object-contain p-2"
                />
              ) : (
                <div className="rounded-md border bg-muted p-8 text-center text-sm text-muted-foreground">
                  No output image saved for this run.
                </div>
              )}
              {run.errorMessage ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {run.errorMessage}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-semibold">Run metadata</p>
                <div className="flex flex-wrap gap-2">
                  <Badge>${(run.estimatedCostUsd ?? 0).toFixed(2)} estimated</Badge>
                  {typeof run.actualCostUsd === "number" ? <Badge>${run.actualCostUsd.toFixed(2)} actual</Badge> : null}
                  {typeof setupSummary?.safeToTestOneRealImage === "boolean" ? (
                    <Badge>Setup safe: {setupSummary.safeToTestOneRealImage ? "yes" : "no"}</Badge>
                  ) : null}
                </div>
                {typeof run.metadata?.board_id === "string" ? (
                  <Button asChildLike="link" href={`/boards/${run.metadata.board_id}`} variant="outline" className="w-full">
                    Open source board
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            {run.selectedReferenceLook ? (
              <Card>
                <CardContent className="space-y-3 p-4">
                  <p className="text-sm font-semibold">Selected reference look</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={run.selectedReferenceLook.referenceImageUrl} alt="" className="aspect-[4/5] w-full rounded-md border bg-muted object-contain p-2" />
                  <p className="font-bold">{run.selectedReferenceLook.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {run.selectedReferenceLook.occasion} / {run.selectedReferenceLook.fit} / {run.selectedReferenceLook.colorMood}
                  </p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {run.selectedReferenceLook.items.join(", ")}
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>

        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">Prompt used</p>
            <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
              {run.promptUsed ?? "No prompt recorded."}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">Quality checklist and tuning notes</p>
            {quality ? (
              <pre className="overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                {JSON.stringify(quality, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">No quality checklist saved yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">Safe metadata</p>
            <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
              {JSON.stringify(run.metadata ?? {}, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
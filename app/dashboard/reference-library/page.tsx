import { redirect } from "next/navigation";
import { AppNav } from "@/components/common/AppNav";
import { ConfigWarning } from "@/components/common/ConfigWarning";
import { ReferenceLibraryManager } from "@/components/reference-library/ReferenceLibraryManager";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ReferenceLibraryPage() {
  const supabaseReady = isSupabaseConfigured();
  const { user } = await getCurrentUser();

  if (supabaseReady && !user) {
    redirect("/login");
  }

  return (
    <>
      <AppNav />
      <main className="container space-y-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Reference Library</p>
            <h1 className="text-3xl font-bold tracking-normal">Curated photo assets</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Upload, tag, and reuse real reference photos for Pick Looks without paid AI generation or scraping.
            </p>
          </div>
          <Button asChildLike="link" href="/dashboard" variant="outline">
            Back to Dashboard
          </Button>
        </div>

        {!supabaseReady ? (
          <ConfigWarning>
            Supabase is not configured. Reference Library persistence needs Supabase, the reference_assets migration, and the reference-assets bucket.
          </ConfigWarning>
        ) : null}

        <ReferenceLibraryManager />
      </main>
    </>
  );
}

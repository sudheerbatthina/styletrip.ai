import { redirect } from "next/navigation";
import { AppNav } from "@/components/common/AppNav";
import { ConfigWarning } from "@/components/common/ConfigWarning";
import { SetupHealthCard } from "@/components/dashboard/SetupHealthCard";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SetupHealthPage() {
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
            <p className="text-sm font-semibold text-primary">Setup Health</p>
            <h1 className="text-3xl font-bold tracking-normal">Provider test readiness</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Check Supabase setup, migrations, storage buckets, provider keys, and guardrails before
              running any one-image real-provider test.
            </p>
          </div>
          <Button asChildLike="link" href="/dashboard" variant="outline">
            Back to Dashboard
          </Button>
        </div>

        {!supabaseReady ? (
          <ConfigWarning>
            Supabase is not configured. Setup Health can still show environment and provider guard
            status, but database, auth, and storage checks will remain incomplete.
          </ConfigWarning>
        ) : null}

        <SetupHealthCard />
      </main>
    </>
  );
}

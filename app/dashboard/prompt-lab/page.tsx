import { redirect } from "next/navigation";
import { AppNav } from "@/components/common/AppNav";
import { PromptLabCard } from "@/components/prompt-lab/PromptLabCard";
import { Button } from "@/components/ui/button";
import { isPromptLabVisible } from "@/lib/ai/provider-router";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PromptLabPage() {
  if (!isPromptLabVisible()) {
    redirect("/dashboard");
  }

  if (!isSupabaseConfigured()) {
    redirect("/dashboard");
  }

  const { user } = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <AppNav />
      <main className="container space-y-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Developer/demo</p>
            <h1 className="text-3xl font-bold tracking-normal">Prompt Lab</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Create copyable ChatGPT-style prompts from saved boards, then import manual result images back into StyleTrip.
            </p>
          </div>
          <Button asChildLike="link" href="/dashboard" variant="outline">Back to dashboard</Button>
        </div>
        <PromptLabCard />
      </main>
    </>
  );
}

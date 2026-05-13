import Link from "next/link";
import { ArrowRight, Images, LockKeyhole, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function LandingPage() {
  const supabaseReady = isSupabaseConfigured();

  return (
    <main className="min-h-screen">
      <section className="border-b bg-card">
        <div className="container flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="text-sm font-bold text-primary">
            StyleTrip AI
          </Link>
          <div className="flex gap-2">
            <Button asChildLike="link" variant="outline" href="/login">
              Log in
            </Button>
            <Button asChildLike="link" href="/signup">
              Sign up
            </Button>
          </div>
        </div>
      </section>

      <section className="container grid min-h-[calc(100vh-76px)] items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-accent" />
            AI outfit inspiration for trips
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-normal sm:text-6xl">
              Build, save, and revisit travel style boards.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Upload a full-body photo, answer a few trip preferences, choose outfit
              directions, and generate polished fashion-board collages without
              identity claims or sensitive assumptions.
            </p>
          </div>
          {!supabaseReady ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
              Supabase is not configured yet. You can still use mock generation at
              `/boards/new`, but login, dashboards, and saved boards need Supabase
              environment variables.
            </div>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChildLike="link" size="lg" href="/dashboard">
              Open Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button asChildLike="link" size="lg" variant="outline" href="/boards/new">
              Try Builder
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="space-y-4 p-5">
            {[
              ["Respectful analysis", "Visible fashion-relevant attributes only."],
              ["Saved boards", "Persist board metadata and generated images."],
              ["Mock mode", "Develop the full flow without OpenAI calls."],
            ].map(([title, copy], index) => (
              <div key={title} className="flex gap-3 rounded-lg border bg-muted/35 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-background">
                  {index === 0 ? (
                    <LockKeyhole className="h-5 w-5 text-primary" />
                  ) : (
                    <Images className="h-5 w-5 text-primary" />
                  )}
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

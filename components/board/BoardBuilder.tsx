"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { StepHeader } from "@/components/common/StepHeader";
import { PreferenceForm, defaultPreferences } from "@/components/preferences/PreferenceForm";
import { GeneratedBoard } from "@/components/result/GeneratedBoard";
import { StyleGrid } from "@/components/styles/StyleGrid";
import { PhotoUploader } from "@/components/upload/PhotoUploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ToastProvider, useToast } from "@/components/ui/toast";
import type {
  ImageInput,
  OutfitImage,
  OutfitImagesResponse,
  Preferences,
  StyleAnalysis,
  StyleCardData,
  StyleOptionsResponse,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";

type Step = "upload" | "preferences" | "styles" | "generate" | "result";

type GeneratedHistoryItem = {
  id: string;
  image: string;
  createdAt: string;
};

type BoardBuilderSavePayload = {
  image: ImageInput;
  boardImage: string;
  outfitImages: OutfitImage[];
  analysis: StyleAnalysis;
  selectedStyles: StyleCardData[];
  preferences: Preferences;
};

const steps: Array<{ id: Step; label: string }> = [
  { id: "upload", label: "Upload" },
  { id: "preferences", label: "Preferences" },
  { id: "styles", label: "Choose Styles" },
  { id: "generate", label: "Generate" },
  { id: "result", label: "Result" },
];

const styleCountOptions = [4, 8, 12, 16];

export function BoardBuilder({
  persistEnabled = false,
  onSaveBoard,
}: {
  persistEnabled?: boolean;
  onSaveBoard?: (payload: BoardBuilderSavePayload) => Promise<void>;
}) {
  return (
    <ToastProvider>
      <StyleTripApp persistEnabled={persistEnabled} onSaveBoard={onSaveBoard} />
    </ToastProvider>
  );
}

function StyleTripApp({
  persistEnabled,
  onSaveBoard,
}: {
  persistEnabled: boolean;
  onSaveBoard?: (payload: BoardBuilderSavePayload) => Promise<void>;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("upload");
  const [image, setImage] = useState<ImageInput | null>(null);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);
  const [styles, setStyles] = useState<StyleCardData[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [styleTarget, setStyleTarget] = useState(12);
  const [outfitImages, setOutfitImages] = useState<OutfitImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [history] = useState<GeneratedHistoryItem[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }
    try {
      const raw = sessionStorage.getItem("styletrip-history");
      return raw ? (JSON.parse(raw) as GeneratedHistoryItem[]) : [];
    } catch {
      sessionStorage.removeItem("styletrip-history");
      return [];
    }
  });
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);

  const loading = Boolean(loadingLabel);
  const selectedStyles = useMemo(
    () => styles.filter((style) => selectedIds.includes(style.id)),
    [selectedIds, styles],
  );

  async function postJson<T>(url: string, payload: unknown): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as T & { error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "Request failed.");
    }
    return data;
  }

  async function handleAnalyze(nextPreferences: Preferences) {
    if (!image) {
      toast({
        title: "Upload a photo first",
        description: "A full-body photo is needed before analysis can run.",
      });
      return;
    }

    setPreferences(nextPreferences);
    setStyleTarget(nextPreferences.numberOfStyleIdeas);
    setLoadingLabel("Analyzing photo");

    try {
      const result = await postJson<StyleAnalysis>("/api/analyze-photo", {
        image,
        preferences: nextPreferences,
      });
      setAnalysis(result);
      setStep("preferences");
    } catch (error) {
      toast({
        title: "Photo analysis failed",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setLoadingLabel(null);
    }
  }

  async function handleGenerateStyles() {
    if (!analysis) {
      return;
    }

    setLoadingLabel("Building style options");
    try {
      const result = await postJson<StyleOptionsResponse>(
        "/api/generate-style-options",
        { analysis, preferences },
      );
      setStyles(result.styles);
      setSelectedIds(result.styles.slice(0, styleTarget).map((style) => style.id));
      setStep("styles");
    } catch (error) {
      toast({
        title: "Style option generation failed",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setLoadingLabel(null);
    }
  }

  function toggleStyle(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }
      if (current.length >= styleTarget) {
        return current;
      }
      return [...current, id];
    });
  }

  function updateStyleTarget(nextTarget: number) {
    setStyleTarget(nextTarget);
    setPreferences((current) => ({
      ...current,
      numberOfStyleIdeas: nextTarget,
    }));
    setSelectedIds((current) => {
      if (current.length > nextTarget) {
        return current.slice(0, nextTarget);
      }
      const missing = styles
        .map((style) => style.id)
        .filter((id) => !current.includes(id))
        .slice(0, nextTarget - current.length);
      return [...current, ...missing];
    });
  }

  async function handleGenerateBoard(instruction?: string) {
    if (!image || !analysis || selectedStyles.length < 4) {
      toast({
        title: "Choose at least four styles",
        description: "The board works best with 4, 8, 12, or 16 outfit ideas.",
      });
      return;
    }

    setStep(outfitImages.length > 0 ? "result" : "generate");
    setLoadingLabel(instruction ? "Finalizing image" : "Generating outfit images");

    try {
      const result = await postJson<OutfitImagesResponse>("/api/generate-outfit-images", {
        image,
        analysis,
        selectedStyles,
        preferences,
        aspectRatio: preferences.aspectRatio,
        editInstruction: instruction,
      });
      setOutfitImages(result.outfitImages);
      setStep("result");
    } catch (error) {
      toast({
        title: "Board generation failed",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setLoadingLabel(null);
    }
  }

  async function handleSaveBoard(boardImage: string) {
    if (!image || !analysis || outfitImages.length === 0) {
      toast({
        title: "Generate a board first",
        description: "A finished board is required before saving.",
      });
      return;
    }

    if (!onSaveBoard) {
      toast({
        title: "Saving is not configured",
        description: "Connect Supabase from the dashboard to save boards.",
      });
      return;
    }

    setSaving(true);
    try {
      await onSaveBoard({
        image,
        boardImage,
        outfitImages,
        analysis,
        selectedStyles,
        preferences,
      });
      toast({
        title: "Board saved",
        description: "You can open it again from your dashboard.",
      });
    } catch (error) {
      toast({
        title: "Could not save board",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  const activeStepIndex = steps.findIndex((item) => item.id === step);

  return (
    <main className="min-h-screen">
      <section className="border-b bg-card">
        <div className="container py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">StyleTrip AI</p>
              <h1 className="text-3xl font-bold tracking-normal">
                Travel outfit inspiration boards
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              {steps.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "rounded-md border px-3 py-2 text-xs font-semibold transition",
                    index <= activeStepIndex
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground",
                  )}
                  onClick={() => {
                    if (index <= activeStepIndex) {
                      setStep(item.id);
                    }
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {loadingLabel ? <LoadingBar label={loadingLabel} /> : null}

      <section className="container py-6 sm:py-8">
        {step === "upload" ? (
          <div className="space-y-6">
            <StepHeader
              eyebrow="Step 1"
              title="Upload and set the trip direction"
              description="Add a full-body photo and a few trip preferences. The analysis is limited to visible styling details and avoids identity or sensitive inferences."
            />
            <div className="grid gap-6 lg:grid-cols-[430px_minmax(0,1fr)]">
              <PhotoUploader
                value={image}
                onChange={setImage}
                onError={(message) =>
                  toast({ title: "Upload issue", description: message })
                }
              />
              <Card>
                <CardHeader>
                  <CardTitle>Trip and style preferences</CardTitle>
                  <CardDescription>
                    Defaults are set for a Las Vegas vacation and a square board.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PreferenceForm
                    defaultValues={preferences}
                    onSubmit={handleAnalyze}
                    disabled={loading}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}

        {step === "preferences" && analysis ? (
          <div className="space-y-6">
            <StepHeader
              eyebrow="Step 2"
              title="Style profile"
              description="Review the respectful style-only analysis, then build creative outfit directions from it."
            />
            <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
              {image ? <PhotoPreview image={image} /> : null}
              <AnalysisPanel analysis={analysis} onContinue={handleGenerateStyles} />
            </div>
          </div>
        ) : null}

        {step === "styles" ? (
          <div className="space-y-6">
            <StepHeader
              eyebrow="Step 3"
              title="Choose style types"
              description="Select the outfit concepts that should appear on the board. Each option stays creative, wearable, and trip-focused."
            />
            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-4">
                {image ? <PhotoPreview image={image} /> : null}
                <Card>
                  <CardContent className="space-y-4 p-4">
                    <div>
                      <p className="text-sm font-semibold">Board size</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedIds.length} of {styleTarget} selected
                      </p>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {styleCountOptions.map((count) => (
                        <Button
                          key={count}
                          type="button"
                          size="sm"
                          variant={styleTarget === count ? "default" : "outline"}
                          onClick={() => updateStyleTarget(count)}
                        >
                          {count}
                        </Button>
                      ))}
                    </div>
                    <Button
                      className="w-full"
                      disabled={selectedStyles.length < 4}
                      onClick={() => setStep("generate")}
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
              <StyleGrid
                styles={styles}
                selectedIds={selectedIds}
                maxSelected={styleTarget}
                onToggle={toggleStyle}
              />
            </div>
          </div>
        ) : null}

        {step === "generate" ? (
          <div className="space-y-6">
            <StepHeader
              eyebrow="Step 4"
              title="Generate the inspiration board"
              description="The final output is a polished collage with numbered outfit panels, style notes, colors, footwear, and accessories."
            />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <SelectedStylesPreview styles={selectedStyles} />
              <Card>
                <CardContent className="space-y-4 p-5">
                  <Badge>{preferences.aspectRatio} board</Badge>
                  <h2 className="text-xl font-bold">
                    {selectedStyles.length} outfits ready
                  </h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    The board is generated as AI outfit inspiration, not an exact
                    try-on. It will avoid explicit clothing, sensitive assumptions,
                    and real brand logos.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="lg"
                      disabled={loading || selectedStyles.length < 4}
                      onClick={() => void handleGenerateBoard()}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Generate Board
                    </Button>
                    <Button variant="outline" onClick={() => setStep("styles")}>
                      <ArrowLeft className="h-4 w-4" />
                      Change Styles
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}

        {step === "result" && outfitImages.length > 0 && analysis ? (
          <div className="space-y-6">
            <StepHeader
              eyebrow="Step 5"
              title="Result gallery"
              description="Download the current board, regenerate it with a quick direction, or edit the setup and create another version."
            />
            <GeneratedBoard
              analysis={analysis}
              preferences={preferences}
              selectedStyles={selectedStyles}
              outfitImages={outfitImages}
              loading={loading}
              onRegenerate={(instruction) => void handleGenerateBoard(instruction)}
              onEditPreferences={() => setStep("upload")}
              persistEnabled={persistEnabled}
              saving={saving}
              onSaveBoard={(boardImage) => void handleSaveBoard(boardImage)}
            />
            {history.length > 1 ? <HistoryGallery history={history} /> : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function LoadingBar({ label }: { label: string }) {
  return (
    <div className="border-b bg-background">
      <div className="container py-3">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{label}</p>
            <Progress value={label === "Finalizing image" ? 88 : 55} className="mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PhotoPreview({ image }: { image: ImageInput }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg border bg-muted">
          <Image
            src={image.dataUrl}
            alt="Uploaded style reference"
            fill
            className="object-contain"
            unoptimized
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Your photo is used only to generate style suggestions for this session.
        </p>
      </CardContent>
    </Card>
  );
}

function AnalysisPanel({
  analysis,
  onContinue,
}: {
  analysis: StyleAnalysis;
  onContinue: () => void;
}) {
  const profile = analysis.visibleStyleProfile;

  return (
    <Card>
      <CardContent className="space-y-6 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoBlock title="Frame notes" value={profile.bodyFrame} />
          <InfoBlock title="Proportions" value={profile.proportionNotes} />
          <InfoBlock title="Color styling" value={profile.skinToneStylingNotes} />
          <InfoBlock title="Current outfit" value={profile.currentOutfitNotes} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdviceList title="Fit advice" items={profile.fitAdvice} positive />
          <AdviceList title="Avoid" items={profile.avoidAdvice} />
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold">Recommended palette</p>
          <div className="flex flex-wrap gap-2">
            {analysis.recommendedColorPalette.map((color) => (
              <Badge key={color}>{color}</Badge>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold">Silhouettes</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {analysis.recommendedSilhouettes.map((item) => (
              <div key={item} className="rounded-md border bg-muted/35 p-3 text-sm">
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="rounded-lg border bg-muted/35 p-4 text-sm leading-6 text-muted-foreground">
          {analysis.confidenceNotes}
        </p>
        <Button onClick={onContinue} size="lg">
          Build 24 Style Options
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function InfoBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{value}</p>
    </div>
  );
}

function AdviceList({
  title,
  items,
  positive,
}: {
  title: string;
  items: string[];
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <p key={item} className="flex gap-2 text-sm leading-6 text-muted-foreground">
            {positive ? (
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-accent" />
            ) : (
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
            )}
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function SelectedStylesPreview({ styles }: { styles: StyleCardData[] }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {styles.map((style, index) => (
            <div key={style.id} className="rounded-lg border bg-muted/35 p-4">
              <Badge>{index + 1}</Badge>
              <h3 className="mt-3 text-sm font-bold">{style.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {style.items.join(", ")}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryGallery({ history }: { history: GeneratedHistoryItem[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">Session boards</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {history.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-3">
              <div className="relative aspect-square overflow-hidden rounded-md border bg-muted">
                <Image
                  src={item.image}
                  alt="Generated board from this session"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { StepHeader } from "@/components/common/StepHeader";
import { CostEstimateCard } from "@/components/cost/CostEstimateCard";
import { GenerationConfirmDialog } from "@/components/cost/GenerationConfirmDialog";
import { PreferenceForm, defaultPreferences } from "@/components/preferences/PreferenceForm";
import { ReferenceFeedbackBar } from "@/components/reference/ReferenceFeedbackBar";
import { ReferenceLookGrid } from "@/components/reference/ReferenceLookGrid";
import { GeneratedBoard } from "@/components/result/GeneratedBoard";
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
import {
  emptyStyleMemory,
} from "@/lib/feedback/feedback-memory";
import type { CostEstimate } from "@/lib/cost/cost-estimator";
import type {
  ImageInput,
  FeedbackType,
  InternalStylePlan,
  OutfitImage,
  OutfitImagesResponse,
  Preferences,
  ReferenceFeedback,
  ReferenceLook,
  ReferenceLooksResponse,
  SelectableStyle,
  StyleAnalysis,
  StyleMemorySummary,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";

type Step = "upload" | "preferences" | "looks" | "generate" | "result";

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
  selectedStyles: SelectableStyle[];
  preferences: Preferences;
};

const steps: Array<{ id: Step; label: string }> = [
  { id: "upload", label: "Upload" },
  { id: "preferences", label: "Preferences" },
  { id: "looks", label: "Pick Looks" },
  { id: "generate", label: "Generate" },
  { id: "result", label: "Result" },
];

const styleCountOptions = [4, 8, 12, 16];
const emptyFeedback: ReferenceFeedback = {
  selected: [],
  deselected: [],
  notMyStyle: [],
  generated: [],
  saved: [],
  downloaded: [],
  refreshCount: 0,
};
const mockMode = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

type ProviderStatusResponse = {
  referenceProvider: string;
  costEstimate: CostEstimate;
};

const fallbackCostEstimate: CostEstimate = {
  mode: "mock",
  provider: "mock",
  imageProvider: "mock",
  textProvider: "mock",
  numberOfImages: 0,
  estimatedTextCostUsd: 0,
  estimatedImageCostUsd: 0,
  estimatedTotalCostUsd: 0,
  maxAllowedCostUsd: 0.25,
  isAllowed: true,
  reason: "Mock mode: $0. No paid APIs will be called.",
};

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
  const [stylePlan, setStylePlan] = useState<InternalStylePlan | null>(null);
  const [referenceLooks, setReferenceLooks] = useState<ReferenceLook[]>([]);
  const [visibleLookIds, setVisibleLookIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [styleTarget, setStyleTarget] = useState(12);
  const [feedback, setFeedback] = useState<ReferenceFeedback>(emptyFeedback);
  const [styleMemory, setStyleMemory] = useState<StyleMemorySummary>(emptyStyleMemory);
  const [providerStatus, setProviderStatus] = useState<ProviderStatusResponse | null>(null);
  const [showGenerationConfirm, setShowGenerationConfirm] = useState(false);
  const [pendingGenerationInstruction, setPendingGenerationInstruction] = useState<string | undefined>();
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
  const selectedLooks = useMemo(
    () =>
      referenceLooks
        .filter((look) => selectedIds.includes(look.id))
        .map((look) => ({ ...look, selected: true })),
    [referenceLooks, selectedIds],
  );
  const visibleLooks = useMemo(
    () =>
      visibleLookIds
        .map((id) => referenceLooks.find((look) => look.id === id))
        .filter((look): look is ReferenceLook => Boolean(look)),
    [referenceLooks, visibleLookIds],
  );
  const preferencesWithFeedback = useMemo(
    () => ({ ...preferences, referenceFeedback: feedback, styleMemory }),
    [feedback, preferences, styleMemory],
  );

  useEffect(() => {
    if (!persistEnabled) {
      return;
    }

    let cancelled = false;

    async function loadStyleMemory() {
      try {
        const response = await fetch("/api/style-feedback", {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as { memory?: StyleMemorySummary };
        if (!cancelled && data.memory) {
          setStyleMemory(data.memory);
        }
      } catch {
        // Style memory is optional; local feedback keeps the builder usable.
      }
    }

    void loadStyleMemory();

    return () => {
      cancelled = true;
    };
  }, [persistEnabled]);

  async function loadProviderStatus(imageCount: number) {
    try {
      const response = await fetch(`/api/provider-status?imageCount=${imageCount}`, {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as ProviderStatusResponse;
      setProviderStatus(data);
    } catch {
      // Provider status is informational; route-level guards remain authoritative.
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadProviderStatus(selectedLooks.length || styleTarget);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [selectedLooks.length, styleTarget]);

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

  function getReferenceLook(id: string) {
    return referenceLooks.find((look) => look.id === id);
  }

  function persistFeedbackEvent(feedbackType: FeedbackType, look: ReferenceLook) {
    if (!persistEnabled) {
      return;
    }

    void postJson<{ ok: boolean }>("/api/style-feedback", {
      referenceLookId: look.id,
      feedbackType,
      lookTitle: look.title,
      occasion: look.occasion,
      fit: look.fit,
      colorMood: look.colorMood,
      items: look.items,
      scoreSnapshot: {
        overallMatchScore: look.overallMatchScore,
        bodyFitScore: look.bodyFitScore,
        colorScore: look.colorScore,
        occasionScore: look.occasionScore,
        preferenceScore: look.preferenceScore,
      },
    }).catch(() => {
      // Feedback persistence is opportunistic; board creation should never fail because of it.
    });
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
    setFeedback(nextPreferences.referenceFeedback ?? emptyFeedback);
    setLoadingLabel("Analyzing photo");

    try {
      const result = await postJson<StyleAnalysis>("/api/analyze-photo", {
        image,
        preferences: nextPreferences,
      });
      setAnalysis(result);
      setReferenceLooks([]);
      setVisibleLookIds([]);
      setSelectedIds([]);
      setOutfitImages([]);
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

  async function handleDiscoverLooks() {
    if (!analysis) {
      return;
    }

    setLoadingLabel("Finding reference looks");
    try {
      const result = await postJson<ReferenceLooksResponse>(
        "/api/generate-reference-looks",
        { analysis, preferences: preferencesWithFeedback },
      );
      setStylePlan(result.stylePlan);
      setReferenceLooks(result.referenceLooks);
      setVisibleLookIds(getInitialVisibleIds(result.referenceLooks, styleTarget, feedback));
      setSelectedIds([]);
      setStep("looks");
    } catch (error) {
      toast({
        title: "Reference look discovery failed",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setLoadingLabel(null);
    }
  }

  function toggleLook(id: string) {
    const look = getReferenceLook(id);
    const isAlreadySelected = selectedIds.includes(id);
    const hasReachedLimit = selectedIds.length >= styleTarget;

    if (!isAlreadySelected && hasReachedLimit) {
      toast({
        title: "Look limit reached",
        description: `You set ${styleTarget} looks to generate. Deselect a look or choose a larger number.`,
      });
      return;
    }

    const nextSelectedIds = isAlreadySelected
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];
    const nextFeedback = isAlreadySelected
      ? appendFeedbackIds(removeFeedbackIds(feedback, "selected", [id]), "deselected", [id])
      : removeFeedbackIds(
          removeFeedbackIds(appendFeedbackIds(feedback, "selected", [id]), "notMyStyle", [id]),
          "deselected",
          [id],
        );

    setSelectedIds(nextSelectedIds);
    setFeedback(nextFeedback);
    setPreferences((current) => ({
      ...current,
      referenceFeedback: nextFeedback,
    }));

    if (look) {
      persistFeedbackEvent(isAlreadySelected ? "deselected" : "selected", look);
    }
  }

  function updateStyleTarget(nextTarget: number) {
    const trimmedSelectedIds = selectedIds.slice(0, nextTarget);
    const trimmedCount = selectedIds.length - trimmedSelectedIds.length;

    setStyleTarget(nextTarget);
    setPreferences((current) => ({
      ...current,
      numberOfStyleIdeas: nextTarget,
    }));
    setSelectedIds(trimmedSelectedIds);
    setVisibleLookIds((current) =>
      getRefreshedVisibleIds(referenceLooks, nextTarget, feedback, trimmedSelectedIds, current),
    );

    if (trimmedCount > 0) {
      toast({
        title: "Selection trimmed",
        description: `Kept your first ${nextTarget} looks for the new generation target.`,
      });
    }
  }

  function toggleFeedback(kind: keyof ReferenceFeedback, id: string) {
    if (kind !== "notMyStyle") {
      return;
    }

    const active = feedback.notMyStyle.includes(id);
    const look = getReferenceLook(id);
    const nextSelectedIds = selectedIds.filter((item) => item !== id);
    const nextFeedback = active
      ? removeFeedbackIds(feedback, "notMyStyle", [id])
      : removeFeedbackIds(appendFeedbackIds(feedback, "notMyStyle", [id]), "selected", [id]);

    setSelectedIds(nextSelectedIds);
    setVisibleLookIds(
      active
        ? getRefreshedVisibleIds(referenceLooks, styleTarget, nextFeedback, nextSelectedIds, visibleLookIds)
        : getVisibleIdsAfterRejection(referenceLooks, styleTarget, nextFeedback, nextSelectedIds, visibleLookIds, id),
    );
    setFeedback(nextFeedback);
    setPreferences((current) => ({
      ...current,
      referenceFeedback: nextFeedback,
    }));

    if (!active && look) {
      persistFeedbackEvent("not_my_style", look);
    }
  }

  function refreshLooks() {
    const nextFeedback = {
      ...feedback,
      refreshCount: feedback.refreshCount + 1,
    };
    const nextVisibleIds = getRefreshedVisibleIds(
      referenceLooks,
      styleTarget,
      nextFeedback,
      selectedIds,
      visibleLookIds,
    );

    setFeedback(nextFeedback);
    setPreferences((current) => ({
      ...current,
      referenceFeedback: nextFeedback,
    }));
    setVisibleLookIds(nextVisibleIds);
    toast({
      title: "Looks refreshed",
      description: "Looks refreshed using your feedback.",
    });
  }

  function getPreferencesWithProviderMetadata() {
    const estimate = providerStatus?.costEstimate ?? fallbackCostEstimate;
    return {
      ...preferencesWithFeedback,
      providerCostMetadata: {
        providerMode: estimate.mode,
        estimatedCostUsd: estimate.estimatedTotalCostUsd,
        imageProvider: estimate.imageProvider,
        textProvider: estimate.textProvider,
        referenceProvider: providerStatus?.referenceProvider ?? "curated",
        styleMemoryUsed:
          styleMemory.selectedCount +
            styleMemory.rejectedCount +
            styleMemory.savedCount +
            styleMemory.downloadedCount >
          0,
      },
    };
  }

  async function handleGenerateBoard(instruction?: string, confirmed = false) {
    if (!image || !analysis || selectedLooks.length < styleTarget) {
      toast({
        title: `Pick ${styleTarget} looks`,
        description: "Select the number of looks you want to generate before continuing.",
      });
      return;
    }

    const estimate = providerStatus?.costEstimate ?? fallbackCostEstimate;
    if (estimate.mode === "blocked") {
      toast({
        title: "Generation blocked",
        description: estimate.reason,
      });
      return;
    }

    if (estimate.mode === "estimate" && !confirmed) {
      setPendingGenerationInstruction(instruction);
      setShowGenerationConfirm(true);
      return;
    }

    setStep(outfitImages.length > 0 ? "result" : "generate");
    setLoadingLabel(instruction ? "Finalizing image" : "Generating personalized looks");

    try {
      const result = await postJson<OutfitImagesResponse>("/api/generate-outfit-images", {
        image,
        analysis,
        selectedStyles: selectedLooks,
        preferences: getPreferencesWithProviderMetadata(),
        aspectRatio: preferences.aspectRatio,
        editInstruction: instruction,
      });
      setOutfitImages(result.outfitImages);
      const generatedFeedback = appendFeedbackIds(feedback, "generated", selectedIds);
      setFeedback(generatedFeedback);
      setPreferences((current) => ({
        ...current,
        referenceFeedback: generatedFeedback,
      }));
      selectedLooks.forEach((look) => persistFeedbackEvent("generated", look));
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
      const savedFeedback = appendFeedbackIds(feedback, "saved", selectedIds);
      await onSaveBoard({
        image,
        boardImage,
        outfitImages,
        analysis,
        selectedStyles: selectedLooks,
        preferences: {
          ...getPreferencesWithProviderMetadata(),
          referenceFeedback: savedFeedback,
        },
      });
      setFeedback(savedFeedback);
      setPreferences((current) => ({
        ...current,
        referenceFeedback: savedFeedback,
      }));
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
              description="Add a full-body photo and a few trip preferences. Your photo is used for styling guidance and resemblance only."
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
                  <CardTitle>Trip and style questions</CardTitle>
                  <CardDescription>
                    Simple answers help us find reference looks that fit the trip.
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
              description="Review the styling-only guidance, then discover visual looks for your trip. We avoid identity claims and sensitive guesses."
            />
            <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
              {image ? <PhotoPreview image={image} /> : null}
              <AnalysisPanel analysis={analysis} onContinue={handleDiscoverLooks} />
            </div>
          </div>
        ) : null}

              {step === "looks" ? (
          <div className="space-y-6">
            <StepHeader
              eyebrow="Step 3"
              title="Pick the looks you like"
              description="Reference looks are inspiration, not exact try-on. We only generate personalized images after you choose looks."
            />
            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-4">
                {image ? <PhotoPreview image={image} /> : null}
                <Card>
                  <CardContent className="space-y-4 p-4">
                    <div>
                      <p className="text-sm font-semibold">Selection progress</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedIds.length} of {styleTarget} selected
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">
                        Looks to generate: 4 / 8 / 12 / 16
                      </p>
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
                    </div>
                    <ReferenceFeedbackBar
                      feedback={feedback}
                      selectedCount={selectedIds.length}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={refreshLooks}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh Looks
                    </Button>
                    <Button
                      className="w-full"
                      disabled={selectedLooks.length < styleTarget}
                      onClick={() => setStep("generate")}
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
                {stylePlan && analysis ? (
                  <StylePlanDetails
                    stylePlan={stylePlan}
                    analysis={analysis}
                    preferences={preferencesWithFeedback}
                  />
                ) : null}
              </div>
              <ReferenceLookGrid
                looks={visibleLooks}
                selectedIds={selectedIds}
                feedback={feedback}
                styleMemory={styleMemory}
                showDebug={mockMode || process.env.NODE_ENV === "development"}
                onToggle={toggleLook}
                onFeedback={toggleFeedback}
              />
            </div>
          </div>
        ) : null}

        {step === "generate" ? (
          <div className="space-y-6">
            <StepHeader
              eyebrow="Step 4"
              title="Generate personalized looks"
              description="Personalized image generation runs only after you select reference looks. The final board text and layout are rendered by the frontend."
            />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <SelectedLooksPreview looks={selectedLooks} />
              <Card>
                <CardContent className="space-y-4 p-5">
                  <Badge>{preferences.aspectRatio} board</Badge>
                  <h2 className="text-xl font-bold">
                    {selectedLooks.length} looks ready
                  </h2>
                  <CostEstimateCard
                    estimate={providerStatus?.costEstimate ?? fallbackCostEstimate}
                  />
                  <p className="text-sm leading-6 text-muted-foreground">
                    The board is generated as AI outfit inspiration, not an exact
                    try-on. It will avoid explicit clothing, sensitive assumptions,
                    and real brand logos.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="lg"
                      disabled={
                        loading ||
                        selectedLooks.length < styleTarget ||
                        providerStatus?.costEstimate.mode === "blocked"
                      }
                      onClick={() => void handleGenerateBoard()}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Generate Board
                    </Button>
                    <Button variant="outline" onClick={() => setStep("looks")}>
                      <ArrowLeft className="h-4 w-4" />
                      Change Looks
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
              preferences={getPreferencesWithProviderMetadata()}
              selectedStyles={selectedLooks}
              outfitImages={outfitImages}
              loading={loading}
              onRegenerate={(instruction) => void handleGenerateBoard(instruction)}
              onEditPreferences={() => setStep("upload")}
              onDownloadBoard={() => {
                const downloadedFeedback = appendFeedbackIds(feedback, "downloaded", selectedIds);
                setFeedback(downloadedFeedback);
                setPreferences((current) => ({
                  ...current,
                  referenceFeedback: downloadedFeedback,
                }));
                selectedLooks.forEach((look) => persistFeedbackEvent("downloaded", look));
              }}
              persistEnabled={persistEnabled}
              saving={saving}
              onSaveBoard={(boardImage) => void handleSaveBoard(boardImage)}
            />
            {history.length > 1 ? <HistoryGallery history={history} /> : null}
          </div>
        ) : null}
        <GenerationConfirmDialog
          open={showGenerationConfirm}
          loading={loading}
          estimate={providerStatus?.costEstimate ?? fallbackCostEstimate}
          onCancel={() => {
            setShowGenerationConfirm(false);
            setPendingGenerationInstruction(undefined);
          }}
          onConfirm={() => {
            setShowGenerationConfirm(false);
            void handleGenerateBoard(pendingGenerationInstruction, true);
            setPendingGenerationInstruction(undefined);
          }}
        />
      </section>
    </main>
  );
}

function getInitialVisibleIds(
  looks: ReferenceLook[],
  target: number,
  feedback: ReferenceFeedback,
) {
  return getRefreshedVisibleIds(looks, target, feedback, [], []);
}

function getVisibleLimit(lookCount: number, target: number) {
  return Math.min(lookCount, Math.max(8, Math.min(24, target + 6)));
}

function getRefreshedVisibleIds(
  looks: ReferenceLook[],
  target: number,
  feedback: ReferenceFeedback,
  selectedIds: string[],
  currentVisibleIds: string[],
) {
  const limit = getVisibleLimit(looks.length, target);
  const orderedIds = orderLooksForFeedback(looks, feedback, selectedIds).map((look) => look.id);
  const selectedVisibleIds = selectedIds.filter((id) => orderedIds.includes(id));
  const preferredCurrentIds = currentVisibleIds.filter(
    (id) => !selectedVisibleIds.includes(id) && !feedback.notMyStyle.includes(id),
  );
  const candidates = orderedIds.filter(
    (id) =>
      !selectedVisibleIds.includes(id) &&
      !preferredCurrentIds.includes(id) &&
      !feedback.notMyStyle.includes(id),
  );

  return uniqueIds([
    ...selectedVisibleIds,
    ...preferredCurrentIds,
    ...candidates,
  ]).slice(0, limit);
}

function getVisibleIdsAfterRejection(
  looks: ReferenceLook[],
  target: number,
  feedback: ReferenceFeedback,
  selectedIds: string[],
  currentVisibleIds: string[],
  rejectedId: string,
) {
  const limit = getVisibleLimit(looks.length, target);
  const baseVisibleIds = currentVisibleIds.filter((id) => id !== rejectedId);
  const orderedReplacementIds = orderLooksForFeedback(looks, feedback, selectedIds)
    .map((look) => look.id)
    .filter(
      (id) =>
        id !== rejectedId &&
        !baseVisibleIds.includes(id) &&
        !feedback.notMyStyle.includes(id),
    );
  const nextVisibleIds = uniqueIds([
    ...selectedIds,
    ...baseVisibleIds,
    ...orderedReplacementIds,
  ]).slice(0, limit);

  return uniqueIds([...nextVisibleIds, rejectedId]).slice(0, Math.min(looks.length, limit + 1));
}

function orderLooksForFeedback(
  looks: ReferenceLook[],
  feedback: ReferenceFeedback,
  selectedIds: string[],
) {
  return [...looks].sort((a, b) => {
    const aGroup = getLookDisplayGroup(a.id, feedback, selectedIds);
    const bGroup = getLookDisplayGroup(b.id, feedback, selectedIds);
    if (aGroup !== bGroup) {
      return aGroup - bGroup;
    }
    return getAdjustedMatchScore(b, feedback) - getAdjustedMatchScore(a, feedback);
  });
}

function getLookDisplayGroup(
  id: string,
  feedback: ReferenceFeedback,
  selectedIds: string[],
) {
  if (selectedIds.includes(id)) {
    return 0;
  }
  if (feedback.notMyStyle.includes(id)) {
    return 2;
  }
  return 1;
}

function getAdjustedMatchScore(
  look: ReferenceLook,
  feedback: ReferenceFeedback,
) {
  return Math.max(
    0,
    look.overallMatchScore - (feedback.notMyStyle.includes(look.id) ? 32 : 0),
  );
}

function appendFeedbackIds(
  feedback: ReferenceFeedback,
  kind: keyof Omit<ReferenceFeedback, "refreshCount">,
  ids: string[],
) {
  return {
    ...feedback,
    [kind]: uniqueIds([...feedback[kind], ...ids]),
  };
}

function removeFeedbackIds(
  feedback: ReferenceFeedback,
  kind: keyof Omit<ReferenceFeedback, "refreshCount">,
  ids: string[],
) {
  return {
    ...feedback,
    [kind]: feedback[kind].filter((id) => !ids.includes(id)),
  };
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
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
          Your photo is used for styling guidance and resemblance only.
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
          Discover Reference Looks
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

function StylePlanDetails({
  stylePlan,
  analysis,
  preferences,
}: {
  stylePlan: InternalStylePlan;
  analysis: StyleAnalysis;
  preferences: Preferences;
}) {
  const dislikedStyles = preferences.dislikedStyles.trim();
  const palette = analysis.recommendedColorPalette.slice(0, 5).join(", ");

  return (
    <details className="rounded-lg border bg-background p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        Why these looks?
      </summary>
      <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
        <p>{stylePlan.overallGuidance}</p>
        <p>
          Match scores blend occasion fit, preferred silhouette, color palette, and your
          dislikes. Higher-scored cards appear first.
        </p>
        <InfoRow
          label="Photo/style profile"
          value={analysis.visibleStyleProfile.currentOutfitNotes}
        />
        <InfoRow
          label="Selected occasions"
          value={preferences.occasionTypes.join(", ") || stylePlan.occasionFocus.join(", ")}
        />
        <InfoRow label="Fit preference" value={preferences.preferredFit} />
        <InfoRow label="Color palette" value={palette || "Flexible travel neutrals"} />
        <InfoRow
          label="Disliked styles avoided"
          value={dislikedStyles || "No disliked styles entered."}
        />
        <div className="flex flex-wrap gap-2">
          {stylePlan.occasionFocus.map((occasion) => (
            <Badge key={occasion}>{occasion}</Badge>
          ))}
        </div>
      </div>
    </details>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-normal text-foreground">
        {label}
      </p>
      <p>{value}</p>
    </div>
  );
}
function SelectedLooksPreview({ looks }: { looks: ReferenceLook[] }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {looks.map((look, index) => (
            <div key={look.id} className="rounded-lg border bg-muted/35 p-4">
              <div className="flex items-center gap-2">
                <Badge>{index + 1}</Badge>
                {look.overallMatchScore > 0 ? (
                  <Badge className="bg-background text-foreground">{Math.round(look.overallMatchScore)}% match</Badge>
                ) : null}
              </div>
              <h3 className="mt-3 text-sm font-bold">{look.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {look.occasion} / {look.fit} / {look.items.join(", ")}
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

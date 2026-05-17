"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, ImagePlus, Sparkles } from "lucide-react";
import { CostEstimateCard } from "@/components/cost/CostEstimateCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AiProviderId } from "@/lib/ai/provider-router";
import type { CostEstimate } from "@/lib/cost/cost-estimator";
import type { ProviderTestPromptVersion } from "@/lib/prompts/provider-test-image-prompt";
import type { ImageInput, ReferenceLook } from "@/lib/schemas";

const demoLooks = [
  {
    id: "provider-test-denim",
    title: "Denim Casual",
    occasion: "daytime walking",
    fit: "relaxed",
    colorMood: "indigo / white / tan",
    items: ["light denim overshirt", "white tee", "straight jeans", "canvas sneakers"],
    promptHint: "clean denim vacation outfit",
  },
  {
    id: "provider-test-resort",
    title: "Desert Resort",
    occasion: "resort dinner",
    fit: "relaxed",
    colorMood: "cream / olive / sand",
    items: ["linen camp shirt", "tank", "pleated shorts", "sandals"],
    promptHint: "desert resort linen look",
  },
  {
    id: "provider-test-night",
    title: "Photo-Friendly Night",
    occasion: "dinner",
    fit: "regular",
    colorMood: "charcoal / rust / cream",
    items: ["textured camp shirt", "pleated trousers", "clean tank", "loafers"],
    promptHint: "photo friendly Vegas outfit",
  },
] satisfies Array<Pick<ReferenceLook, "id" | "title" | "occasion" | "fit" | "colorMood" | "items" | "promptHint">>;

const fallbackEstimate: CostEstimate = {
  mode: "mock",
  provider: "mock",
  imageProvider: "mock",
  textProvider: "mock",
  numberOfImages: 1,
  estimatedTextCostUsd: 0,
  estimatedImageCostUsd: 0,
  estimatedTotalCostUsd: 0,
  maxAllowedCostUsd: 0.25,
  isAllowed: true,
  reason: "Mock mode: $0. No paid APIs will be called.",
};

type ProviderTestResponse = {
  status: "success" | "blocked" | "error";
  provider: AiProviderId;
  estimatedCostUsd: number;
  imageUrlOrBase64?: string | null;
  message: string;
  metadata?: Record<string, unknown>;
};

type ProviderTestHistoryItem = {
  id: string;
  provider: AiProviderId;
  model?: string | null;
  status: "success" | "blocked" | "error";
  promptVersion?: string | null;
  estimatedCostUsd?: number | null;
  outputImageUrl?: string | null;
  errorMessage?: string | null;
  createdAt: string;
};

type QualityChecklist = {
  fullBodyVisible: boolean;
  resemblanceAcceptable: boolean;
  outfitMatchesReference: boolean;
  wearableStyling: boolean;
  noMajorArtifacts: boolean;
  usefulForDemo: boolean;
};

const promptVersions: Array<{
  id: ProviderTestPromptVersion;
  label: string;
  description: string;
}> = [
  {
    id: "v1-basic-look",
    label: "v1 basic look",
    description: "Simple outfit inspiration prompt.",
  },
  {
    id: "v2-full-body-fashion",
    label: "v2 full-body fashion",
    description: "Default: stronger full-body framing and outfit visibility.",
  },
  {
    id: "v3-strong-resemblance-safe",
    label: "v3 resemblance safe",
    description: "Adds stronger resemblance guidance when a reference image is provided.",
  },
];

const checklistLabels: Array<{ id: keyof QualityChecklist; label: string }> = [
  { id: "fullBodyVisible", label: "Full body visible?" },
  { id: "resemblanceAcceptable", label: "Face/body resemblance acceptable?" },
  { id: "outfitMatchesReference", label: "Outfit matches selected reference look?" },
  { id: "wearableStyling", label: "Styling looks wearable?" },
  { id: "noMajorArtifacts", label: "No major artifacts?" },
  { id: "usefulForDemo", label: "Image useful for demo?" },
];

const qualityNoteOptions = [
  "face not similar",
  "outfit not matching",
  "cropped body",
  "too formal",
  "bad hands/artifacts",
];

const defaultChecklist: QualityChecklist = {
  fullBodyVisible: true,
  resemblanceAcceptable: true,
  outfitMatchesReference: true,
  wearableStyling: true,
  noMajorArtifacts: true,
  usefulForDemo: true,
};

export function ProviderTestLabCard() {
  const [provider, setProvider] = useState<AiProviderId>("mock");
  const [lookId, setLookId] = useState(demoLooks[0].id);
  const [promptVersion, setPromptVersion] =
    useState<ProviderTestPromptVersion>("v2-full-body-fashion");
  const [referenceImage, setReferenceImage] = useState<ImageInput | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState("Relaxed travel styling with warm neutrals and full-body resemblance guidance.");
  const [explicitConfirm, setExplicitConfirm] = useState(false);
  const [estimate, setEstimate] = useState<CostEstimate>(fallbackEstimate);
  const [result, setResult] = useState<ProviderTestResponse | null>(null);
  const [history, setHistory] = useState<ProviderTestHistoryItem[]>([]);
  const [historyMessage, setHistoryMessage] = useState("");
  const [qualityStatus, setQualityStatus] = useState<"pass" | "needs_work">("pass");
  const [qualityChecklist, setQualityChecklist] = useState<QualityChecklist>(defaultChecklist);
  const [qualityNotes, setQualityNotes] = useState<string[]>([]);
  const [customQualityNote, setCustomQualityNote] = useState("");
  const [qualitySaveMessage, setQualitySaveMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedLook = useMemo(
    () => demoLooks.find((look) => look.id === lookId) ?? demoLooks[0],
    [lookId],
  );
  const requestLook = useMemo<ReferenceLook>(
    () => ({
      ...selectedLook,
      whyItFits: "Developer test look for safe one-image provider validation.",
      referenceImageUrl: buildPreviewSvg(selectedLook.title),
      source: "curated",
      sourceUrl: null,
      sourceName: "Provider Test Lab",
      photographer: "",
      photographerUrl: null,
      attributionText: "Local test reference",
      selected: true,
      overallMatchScore: 90,
      bodyFitScore: 88,
      colorScore: 86,
      occasionScore: 90,
      preferenceScore: 88,
      whyThisMatches: ["Single-look provider test reference."],
      matchTags: ["test look", selectedLook.fit],
    }),
    [selectedLook],
  );

  useEffect(() => {
    void loadEstimate();
    void loadHistory();
    // The first render should use the current provider only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadEstimate(nextProvider = provider) {
    const response = await fetch(`/api/provider-status?imageCount=1&provider=${nextProvider}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as { costEstimate?: CostEstimate };
    setEstimate(data.costEstimate ?? fallbackEstimate);
  }

  async function loadHistory() {
    try {
      const response = await fetch("/api/provider-test/runs", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json()) as {
        runs?: ProviderTestHistoryItem[];
        available?: boolean;
        reason?: string | null;
      };
      setHistory(data.runs ?? []);
      setHistoryMessage(data.available === false ? data.reason ?? "" : "");
    } catch {
      setHistoryMessage("Provider test history is unavailable right now.");
    }
  }

  async function handleFile(file: File | null) {
    if (!file) {
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setReferenceImage({
      dataUrl,
      mimeType: file.type as ImageInput["mimeType"],
    });
  }

  async function runTest() {
    setLoading(true);
    setResult(null);
    resetQuality();
    try {
      const response = await fetch("/api/provider-test/generate-one", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          selectedReferenceLook: requestLook,
          analysisSummary,
          resemblanceMode: "balanced",
          promptVersion,
          image: referenceImage,
          explicitConfirm,
        }),
      });
      const data = (await response.json()) as ProviderTestResponse;
      setResult(data);
      void loadHistory();
    } catch (error) {
      setResult({
        status: "error",
        provider,
        estimatedCostUsd: estimate.estimatedTotalCostUsd,
        imageUrlOrBase64: null,
        message: error instanceof Error ? error.message : "Provider test failed.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function saveQualityChecklist() {
    if (!result) {
      return;
    }

    const runId = getRunId(result);
    const suggestedNextAction = buildSuggestedNextAction(qualityChecklist, qualityNotes);
    const payload = {
      status: qualityStatus,
      checklist: qualityChecklist,
      notes: qualityNotes,
      customNote: customQualityNote.trim() || undefined,
      suggestedNextAction,
      updatedAt: new Date().toISOString(),
    };

    if (!runId) {
      setQualitySaveMessage("Checklist saved locally for this result. Run history is unavailable.");
      setResult({
        ...result,
        metadata: {
          ...(result.metadata ?? {}),
          quality: payload,
        },
      });
      return;
    }

    try {
      const response = await fetch("/api/provider-test/runs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: runId, quality: payload }),
      });
      const data = (await response.json()) as { saved?: boolean; reason?: string | null };
      setQualitySaveMessage(
        data.saved ? "Checklist saved to test history." : data.reason ?? "Checklist kept locally.",
      );
      setResult({
        ...result,
        metadata: {
          ...(result.metadata ?? {}),
          quality: payload,
        },
      });
      void loadHistory();
    } catch {
      setQualitySaveMessage("Checklist kept locally; history update failed.");
    }
  }

  function resetQuality() {
    setQualityStatus("pass");
    setQualityChecklist(defaultChecklist);
    setQualityNotes([]);
    setCustomQualityNote("");
    setQualitySaveMessage("");
  }

  return (
    <Card className="border-amber-300/60 bg-amber-50/40">
      <CardContent className="space-y-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-100 text-amber-950">Developer-only</Badge>
              <Badge className="bg-background text-foreground">Max 1 image</Badge>
            </div>
            <h2 className="mt-2 text-xl font-bold">Real Provider Test Lab</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Safe one-image harness for later provider validation. The normal board
              generator remains mock-safe.
            </p>
          </div>
        </div>

        <div className="rounded-md border bg-background/80 p-3 text-sm leading-6 text-muted-foreground">
          <div className="flex gap-2">
            <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-700" />
            <p>
              Paid generation is disabled unless explicitly enabled. Check the provider
              dashboard for actual billing after any future real test.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Provider">
                <Select
                  value={provider}
                  onChange={(event) => {
                    const nextProvider = event.target.value as AiProviderId;
                    setProvider(nextProvider);
                    void loadEstimate(nextProvider);
                  }}
                >
                  <option value="mock">mock</option>
                  <option value="openai">openai</option>
                  <option value="gemini">gemini</option>
                  <option value="fal">fal</option>
                </Select>
              </Field>
              <Field label="Reference look">
                <Select value={lookId} onChange={(event) => setLookId(event.target.value)}>
                  {demoLooks.map((look) => (
                    <option key={look.id} value={look.id}>
                      {look.title}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Prompt version">
              <Select
                value={promptVersion}
                onChange={(event) =>
                  setPromptVersion(event.target.value as ProviderTestPromptVersion)
                }
              >
                {promptVersions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs leading-5 text-muted-foreground">
                {promptVersions.find((version) => version.id === promptVersion)?.description}
              </p>
            </Field>

            <Field label="Optional reference image">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
              />
              {referenceImage ? (
                <div className="mt-3 flex items-center gap-3 rounded-md border bg-background p-2 text-xs text-muted-foreground">
                  <img
                    src={referenceImage.dataUrl}
                    alt="Uploaded provider test reference"
                    className="h-16 w-12 rounded border bg-muted object-contain"
                  />
                  <span>Reference image attached for resemblance guidance.</span>
                </div>
              ) : null}
            </Field>

            <Field label="Analysis/profile summary">
              <Textarea
                value={analysisSummary}
                onChange={(event) => setAnalysisSummary(event.target.value)}
              />
            </Field>

            <label className="flex gap-2 rounded-md border bg-background p-3 text-sm leading-6">
              <input
                type="checkbox"
                checked={explicitConfirm}
                onChange={(event) => setExplicitConfirm(event.target.checked)}
              />
              I explicitly confirm this one-image provider test.
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void loadEstimate()}>
                Refresh estimate
              </Button>
              <Button type="button" disabled={loading || !explicitConfirm} onClick={() => void runTest()}>
                <Sparkles className="h-4 w-4" />
                Generate exactly 1 image
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <CostEstimateCard estimate={estimate} />
            <div className="rounded-md border bg-background p-3">
              <p className="text-sm font-semibold">Selected test look</p>
              <img
                src={requestLook.referenceImageUrl}
                alt=""
                className="mt-3 aspect-[4/5] w-full rounded-md border bg-muted object-contain p-3"
              />
              <p className="mt-3 text-sm font-bold">{requestLook.title}</p>
              <p className="text-xs leading-5 text-muted-foreground">
                {requestLook.occasion} / {requestLook.fit} / {requestLook.items.join(", ")}
              </p>
            </div>
          </div>
        </div>

        {result ? (
          <div className="rounded-md border bg-background p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{result.status}</Badge>
              <Badge>{result.provider}</Badge>
              <Badge>{promptVersion}</Badge>
              <Badge>${result.estimatedCostUsd.toFixed(2)} est.</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{result.message}</p>
            {result.imageUrlOrBase64 ? (
              <img
                src={result.imageUrlOrBase64}
                alt="Provider test result"
                className="mt-4 max-h-[520px] w-full rounded-md border bg-muted object-contain p-2"
              />
            ) : null}

            {result.imageUrlOrBase64 ? (
              <div className="mt-4 rounded-md border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Manual quality checklist</p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Save notes for prompt tuning. This never regenerates automatically.
                    </p>
                  </div>
                  <div className="flex rounded-md border bg-background p-1">
                    <button
                      type="button"
                      className={`rounded px-3 py-1 text-xs font-semibold ${
                        qualityStatus === "pass"
                          ? "bg-emerald-100 text-emerald-900"
                          : "text-muted-foreground"
                      }`}
                      onClick={() => setQualityStatus("pass")}
                    >
                      Pass
                    </button>
                    <button
                      type="button"
                      className={`rounded px-3 py-1 text-xs font-semibold ${
                        qualityStatus === "needs_work"
                          ? "bg-amber-100 text-amber-950"
                          : "text-muted-foreground"
                      }`}
                      onClick={() => setQualityStatus("needs_work")}
                    >
                      Needs work
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {checklistLabels.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 rounded-md border bg-background p-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={qualityChecklist[item.id]}
                        onChange={(event) =>
                          setQualityChecklist((current) => ({
                            ...current,
                            [item.id]: event.target.checked,
                          }))
                        }
                      />
                      {item.label}
                    </label>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {qualityNoteOptions.map((note) => {
                    const active = qualityNotes.includes(note);
                    return (
                      <button
                        key={note}
                        type="button"
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          active
                            ? "border-amber-500 bg-amber-100 text-amber-950"
                            : "bg-background text-muted-foreground"
                        }`}
                        onClick={() =>
                          setQualityNotes((current) =>
                            active
                              ? current.filter((item) => item !== note)
                              : [...current, note],
                          )
                        }
                      >
                        {note}
                      </button>
                    );
                  })}
                </div>

                <Field label="Custom note">
                  <Textarea
                    value={customQualityNote}
                    onChange={(event) => setCustomQualityNote(event.target.value)}
                    placeholder="Optional prompt tuning note"
                  />
                </Field>

                <div className="mt-3 rounded-md border bg-background p-3 text-sm leading-6">
                  <p className="font-semibold">Suggested next action</p>
                  <p className="text-muted-foreground">
                    {buildSuggestedNextAction(qualityChecklist, qualityNotes)}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button type="button" variant="outline" onClick={() => void saveQualityChecklist()}>
                    <CheckCircle2 className="h-4 w-4" />
                    Save checklist
                  </Button>
                  {qualitySaveMessage ? (
                    <span className="text-xs text-muted-foreground">{qualitySaveMessage}</span>
                  ) : null}
                </div>
              </div>
            ) : null}

            {result.metadata ? (
              <pre className="mt-4 overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(result.metadata, null, 2)}
              </pre>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-md border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Recent Test Runs</p>
              <p className="text-xs leading-5 text-muted-foreground">
                Stored only for signed-in users after the provider_test_runs migration is applied.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadHistory()}>
              Refresh history
            </Button>
          </div>
          {historyMessage ? (
            <p className="mt-3 text-sm text-muted-foreground">{historyMessage}</p>
          ) : null}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {history.map((run) => (
              <div key={run.id} className="flex gap-3 rounded-md border p-3">
                {run.outputImageUrl ? (
                  <img
                    src={run.outputImageUrl}
                    alt=""
                    className="h-20 w-16 rounded border bg-muted object-contain"
                  />
                ) : (
                  <div className="flex h-20 w-16 items-center justify-center rounded border bg-muted text-muted-foreground">
                    <ImagePlus className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-1">
                    <Badge>{run.provider}</Badge>
                    <Badge>{run.status}</Badge>
                    {run.promptVersion ? <Badge>{run.promptVersion}</Badge> : null}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(run.createdAt).toLocaleString()}
                    {typeof run.estimatedCostUsd === "number"
                      ? ` / $${run.estimatedCostUsd.toFixed(2)} est.`
                      : ""}
                  </p>
                  {run.errorMessage ? (
                    <p className="mt-1 line-clamp-2 text-xs text-destructive">
                      {run.errorMessage}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {!history.length && !historyMessage ? (
            <p className="mt-3 text-sm text-muted-foreground">No provider test runs yet.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function buildPreviewSvg(title: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1200" viewBox="0 0 960 1200"><rect width="960" height="1200" fill="#f4ecdf"/><rect x="110" y="90" width="740" height="1020" rx="38" fill="#fffaf2" stroke="#d2c3ad" stroke-width="4"/><circle cx="480" cy="245" r="70" fill="#b9815d"/><path d="M390 350h180c62 88 78 190 52 360H338c-22-154-5-274 52-360z" fill="#17394a"/><path d="M440 350h78l-20 360h-58z" fill="#f7f2e8"/><path d="M350 710h132l-22 330h-96z" fill="#7f7768"/><path d="M500 710h126l-4 330h-96z" fill="#7f7768"/><path d="M340 1034h142v42H304c-4-26 8-39 36-42z" fill="#24282d"/><path d="M500 1034h142c28 3 40 16 36 42H500z" fill="#24282d"/><text x="480" y="114" text-anchor="middle" font-family="Arial" font-size="30" font-weight="700" fill="#123d52">${escapeSvg(title)}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeSvg(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildSuggestedNextAction(checklist: QualityChecklist, notes: string[]) {
  if (!checklist.fullBodyVisible || notes.includes("cropped body")) {
    return "Try v2 or v3 and keep the full-body framing language. Avoid changing providers until framing is stable.";
  }
  if (!checklist.resemblanceAcceptable || notes.includes("face not similar")) {
    return "Try v3 with a clearer reference image and stronger resemblance mode wording.";
  }
  if (!checklist.outfitMatchesReference || notes.includes("outfit not matching")) {
    return "Tighten the selected look prompt: item list, color mood, and fit should be repeated plainly.";
  }
  if (!checklist.wearableStyling || notes.includes("too formal")) {
    return "Add more casual trip wording and reduce formal/editorial language in the next prompt.";
  }
  if (!checklist.noMajorArtifacts || notes.includes("bad hands/artifacts")) {
    return "Keep this run for comparison and retry later with another provider or model.";
  }
  return "This result is a reasonable prompt baseline. Keep the version and compare against one future provider test.";
}

function getRunId(result: ProviderTestResponse) {
  const persistence = result.metadata?.persistence;
  if (!isRecord(persistence)) {
    return null;
  }
  return typeof persistence.runId === "string" ? persistence.runId : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read reference image."));
    reader.readAsDataURL(file);
  });
}

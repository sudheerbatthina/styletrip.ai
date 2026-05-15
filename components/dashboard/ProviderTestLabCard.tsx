"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, ImagePlus, Sparkles } from "lucide-react";
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

export function ProviderTestLabCard() {
  const [provider, setProvider] = useState<AiProviderId>("mock");
  const [lookId, setLookId] = useState(demoLooks[0].id);
  const [referenceImage, setReferenceImage] = useState<ImageInput | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState("Relaxed travel styling with warm neutrals and full-body resemblance guidance.");
  const [explicitConfirm, setExplicitConfirm] = useState(false);
  const [estimate, setEstimate] = useState<CostEstimate>(fallbackEstimate);
  const [result, setResult] = useState<ProviderTestResponse | null>(null);
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
    try {
      const response = await fetch("/api/provider-test/generate-one", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          selectedReferenceLook: requestLook,
          analysisSummary,
          resemblanceMode: "balanced",
          image: referenceImage,
          explicitConfirm,
        }),
      });
      const data = (await response.json()) as ProviderTestResponse;
      setResult(data);
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

            <Field label="Optional reference image">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
              />
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
            {result.metadata ? (
              <pre className="mt-4 overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(result.metadata, null, 2)}
              </pre>
            ) : null}
          </div>
        ) : null}
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read reference image."));
    reader.readAsDataURL(file);
  });
}

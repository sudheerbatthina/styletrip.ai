"use client";

/* eslint-disable @next/next/no-img-element */

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Edit3, ImagePlus, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ReferenceAsset = {
  id: string;
  title: string;
  source: string;
  sourceName?: string | null;
  sourceUrl?: string | null;
  photographer?: string | null;
  photographerUrl?: string | null;
  attributionText?: string | null;
  displayImageUrl?: string | null;
  imageUrl?: string | null;
  occasionTags: string[];
  styleTags: string[];
  fitTags: string[];
  colorTags: string[];
  itemTags: string[];
  seasonTags: string[];
  createdAt: string;
};

type Draft = {
  id?: string;
  title: string;
  imageDataUrl: string;
  imageUrl: string;
  source: string;
  sourceName: string;
  sourceUrl: string;
  photographer: string;
  photographerUrl: string;
  attributionText: string;
  genderStyle: string;
  occasionTags: string;
  styleTags: string;
  fitTags: string;
  colorTags: string;
  itemTags: string;
  seasonTags: string;
};

const emptyDraft: Draft = {
  title: "",
  imageDataUrl: "",
  imageUrl: "",
  source: "curated",
  sourceName: "My Library",
  sourceUrl: "",
  photographer: "",
  photographerUrl: "",
  attributionText: "",
  genderStyle: "men's adaptable style",
  occasionTags: "",
  styleTags: "",
  fitTags: "relaxed",
  colorTags: "",
  itemTags: "",
  seasonTags: "",
};

export function ReferenceLibraryManager() {
  const [assets, setAssets] = useState<ReferenceAsset[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadAssets();
  }, []);

  const previewUrl = useMemo(() => draft.imageDataUrl || draft.imageUrl, [draft.imageDataUrl, draft.imageUrl]);

  async function loadAssets() {
    try {
      const response = await fetch("/api/reference-assets?limit=80", { cache: "no-store" });
      const data = (await response.json()) as { assets?: ReferenceAsset[]; available?: boolean; reason?: string | null };
      setAssets(data.assets ?? []);
      setMessage(data.available === false ? data.reason ?? "Reference Library is not fully set up yet." : "");
    } catch {
      setMessage("Reference Library could not load. The app will keep using fallback references.");
    }
  }

  async function onFileChange(file?: File) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setMessage("Upload a JPG, PNG, or WEBP reference photo.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setMessage("Reference photo must be under 8MB.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setDraft((current) => ({ ...current, imageDataUrl: dataUrl, imageUrl: "" }));
    setMessage("");
  }

  function editAsset(asset: ReferenceAsset) {
    setDraft({
      id: asset.id,
      title: asset.title,
      imageDataUrl: "",
      imageUrl: asset.imageUrl ?? asset.displayImageUrl ?? "",
      source: asset.source,
      sourceName: asset.sourceName ?? "My Library",
      sourceUrl: asset.sourceUrl ?? "",
      photographer: asset.photographer ?? "",
      photographerUrl: asset.photographerUrl ?? "",
      attributionText: asset.attributionText ?? "",
      genderStyle: "",
      occasionTags: asset.occasionTags.join(", "),
      styleTags: asset.styleTags.join(", "),
      fitTags: asset.fitTags.join(", "),
      colorTags: asset.colorTags.join(", "),
      itemTags: asset.itemTags.join(", "),
      seasonTags: asset.seasonTags.join(", "),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveDraft() {
    if (!draft.title.trim()) {
      setMessage("Add a title before saving the reference asset.");
      return;
    }
    if (!draft.imageDataUrl && !draft.imageUrl.trim()) {
      setMessage("Upload a reference photo or add an image URL.");
      return;
    }

    setLoading(true);
    try {
      const payload = draftToPayload(draft);
      const response = await fetch(draft.id ? `/api/reference-assets/${draft.id}` : "/api/reference-assets", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { saved?: boolean; asset?: ReferenceAsset | null; reason?: string | null };
      if (data.saved && data.asset) {
        setMessage("Reference asset saved.");
        setDraft(emptyDraft);
        await loadAssets();
      } else {
        setMessage(data.reason ?? "Reference asset could not be saved. Check migration and storage setup.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reference asset could not be saved.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteAsset(id: string) {
    if (!window.confirm("Delete this reference asset?")) return;
    const response = await fetch(`/api/reference-assets/${id}`, { method: "DELETE" });
    const data = (await response.json()) as { deleted?: boolean; reason?: string | null };
    setMessage(data.deleted ? "Reference asset deleted." : data.reason ?? "Could not delete reference asset.");
    await loadAssets();
  }

  return (
    <div className="space-y-6">
      {message ? <p className="rounded-md border bg-muted/25 p-3 text-sm text-muted-foreground">{message}</p> : null}

      <Card>
        <CardContent className="space-y-5 p-4">
          <div>
            <p className="text-sm font-semibold">Add reference photo</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Upload model-style or lookbook photos you have rights to use. Tags help StyleTrip surface them before fallback illustrations.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="flex min-h-80 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
                {previewUrl ? (
                  <img src={previewUrl} alt="Reference preview" className="h-full max-h-96 w-full object-contain p-2" />
                ) : (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    <ImagePlus className="mx-auto mb-2 h-8 w-8" />
                    Upload a JPG, PNG, or WEBP.
                  </div>
                )}
              </div>
              <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void onFileChange(event.target.files?.[0])} />
              <Field label="External image URL"><Input value={draft.imageUrl} onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value, imageDataUrl: "" })} placeholder="https://..." /></Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title"><Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Relaxed linen airport fit" /></Field>
              <Field label="Gender/style direction"><Input value={draft.genderStyle} onChange={(event) => setDraft({ ...draft, genderStyle: event.target.value })} placeholder="men's adaptable style" /></Field>
              <Field label="Occasion tags"><Input value={draft.occasionTags} onChange={(event) => setDraft({ ...draft, occasionTags: event.target.value })} placeholder="airport, dinner, vacation" /></Field>
              <Field label="Style tags"><Input value={draft.styleTags} onChange={(event) => setDraft({ ...draft, styleTags: event.target.value })} placeholder="linen, streetwear, resort" /></Field>
              <Field label="Fit tags"><Input value={draft.fitTags} onChange={(event) => setDraft({ ...draft, fitTags: event.target.value })} placeholder="relaxed, regular" /></Field>
              <Field label="Color tags"><Input value={draft.colorTags} onChange={(event) => setDraft({ ...draft, colorTags: event.target.value })} placeholder="cream, olive, black" /></Field>
              <Field label="Item tags"><Input value={draft.itemTags} onChange={(event) => setDraft({ ...draft, itemTags: event.target.value })} placeholder="camp shirt, trousers, sneakers" /></Field>
              <Field label="Season tags"><Input value={draft.seasonTags} onChange={(event) => setDraft({ ...draft, seasonTags: event.target.value })} placeholder="summer, spring" /></Field>
              <Field label="Source"><Input value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value })} placeholder="curated" /></Field>
              <Field label="Source name"><Input value={draft.sourceName} onChange={(event) => setDraft({ ...draft, sourceName: event.target.value })} placeholder="My Library" /></Field>
              <Field label="Photographer"><Input value={draft.photographer} onChange={(event) => setDraft({ ...draft, photographer: event.target.value })} /></Field>
              <Field label="Photographer URL"><Input value={draft.photographerUrl} onChange={(event) => setDraft({ ...draft, photographerUrl: event.target.value })} /></Field>
              <div className="sm:col-span-2"><Field label="Source URL"><Input value={draft.sourceUrl} onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })} /></Field></div>
              <div className="sm:col-span-2"><Field label="Attribution text"><Textarea value={draft.attributionText} onChange={(event) => setDraft({ ...draft, attributionText: event.target.value })} placeholder="Photo by..." /></Field></div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void saveDraft()} disabled={loading}><Save className="h-4 w-4" />{draft.id ? "Save changes" : "Save asset"}</Button>
            <Button type="button" variant="outline" onClick={() => setDraft(emptyDraft)}>Clear</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset) => (
          <Card key={asset.id} className="overflow-hidden">
            <div className="aspect-[3/4] bg-muted/40">
              {asset.displayImageUrl || asset.imageUrl ? <img src={asset.displayImageUrl ?? asset.imageUrl ?? ""} alt={asset.title} className="h-full w-full object-cover" /> : null}
            </div>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap gap-2"><Badge>{asset.sourceName || asset.source}</Badge>{asset.occasionTags.slice(0, 2).map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
              <h3 className="font-bold">{asset.title}</h3>
              <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{[...asset.styleTags, ...asset.itemTags].slice(0, 5).join(" / ") || "No tags yet."}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => editAsset(asset)}><Edit3 className="h-4 w-4" />Edit</Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => void deleteAsset(asset.id)}><Trash2 className="h-4 w-4" />Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function draftToPayload(draft: Draft) {
  return {
    title: draft.title.trim(),
    source: draft.source.trim() || "curated",
    sourceName: draft.sourceName.trim() || null,
    sourceUrl: draft.sourceUrl.trim() || null,
    photographer: draft.photographer.trim() || null,
    photographerUrl: draft.photographerUrl.trim() || null,
    attributionText: draft.attributionText.trim() || null,
    imageDataUrl: draft.imageDataUrl || null,
    imageUrl: draft.imageUrl.trim() || null,
    genderStyle: draft.genderStyle.trim() || null,
    occasionTags: splitList(draft.occasionTags),
    styleTags: splitList(draft.styleTags),
    fitTags: splitList(draft.fitTags),
    colorTags: splitList(draft.colorTags),
    itemTags: splitList(draft.itemTags),
    seasonTags: splitList(draft.seasonTags),
    metadata: { source: "reference-library-ui" },
  };
}

function splitList(value: string) {
  return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}



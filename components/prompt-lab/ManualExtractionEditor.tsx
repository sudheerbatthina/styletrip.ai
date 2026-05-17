"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ExtractedLook = {
  id: string;
  manualResultId: string;
  boardId?: string | null;
  title: string;
  occasion?: string | null;
  fit?: string | null;
  colorMood?: string | null;
  items: string[];
  colors: string[];
  footwear?: string[];
  accessories?: string[];
  whyItWorks?: string | null;
  matchScore?: number | null;
  sourceImageUrl?: string | null;
  sourceCropUrl?: string | null;
  createdAt: string;
};

type Draft = {
  id?: string;
  title: string;
  occasion: string;
  fit: string;
  colorMood: string;
  items: string;
  colors: string;
  footwear: string;
  accessories: string;
  whyItWorks: string;
  matchScore: string;
};

const emptyDraft: Draft = {
  title: "",
  occasion: "",
  fit: "relaxed",
  colorMood: "",
  items: "",
  colors: "",
  footwear: "",
  accessories: "",
  whyItWorks: "",
  matchScore: "82",
};

export function ManualExtractionEditor({
  manualResultId,
  boardId,
  importedImageUrl,
}: {
  manualResultId: string;
  boardId?: string | null;
  importedImageUrl?: string | null;
}) {
  const [looks, setLooks] = useState<ExtractedLook[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadLooks();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadLooks() {
    try {
      const response = await fetch(`/api/prompt-lab/extracted-looks?manualResultId=${manualResultId}`, { cache: "no-store" });
      const data = (await response.json()) as { looks?: ExtractedLook[]; available?: boolean; reason?: string | null };
      setLooks(data.looks ?? []);
      setMessage(data.available === false ? data.reason ?? "" : "");
    } catch {
      setMessage("Extracted looks are unavailable right now.");
    }
  }

  function editLook(look: ExtractedLook) {
    setDraft({
      id: look.id,
      title: look.title,
      occasion: look.occasion ?? "",
      fit: look.fit ?? "",
      colorMood: look.colorMood ?? "",
      items: look.items.join(", "),
      colors: look.colors.join(", "),
      footwear: (look.footwear ?? []).join(", "),
      accessories: (look.accessories ?? []).join(", "),
      whyItWorks: look.whyItWorks ?? "",
      matchScore: String(look.matchScore ?? 82),
    });
  }

  async function saveDraft() {
    if (!draft.title.trim()) {
      setMessage("Add a title before saving the extracted look.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        manualResultId,
        boardId: boardId ?? null,
        title: draft.title.trim(),
        occasion: draft.occasion.trim() || null,
        fit: draft.fit.trim() || null,
        colorMood: draft.colorMood.trim() || null,
        items: splitList(draft.items),
        colors: splitList(draft.colors),
        footwear: splitList(draft.footwear),
        accessories: splitList(draft.accessories),
        whyItWorks: draft.whyItWorks.trim() || null,
        matchScore: Number.isFinite(Number(draft.matchScore)) ? Number(draft.matchScore) : null,
        metadata: { source: "manual-extraction-editor" },
      };
      const response = await fetch(draft.id ? `/api/prompt-lab/extracted-looks/${draft.id}` : "/api/prompt-lab/extracted-looks", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { saved?: boolean; reason?: string | null; look?: ExtractedLook | null };
      if (data.saved && data.look) {
        setLooks((current) => [data.look!, ...current.filter((look) => look.id !== data.look!.id)]);
        setMessage("Extracted look saved.");
        void loadLooks();
      } else {
        const localLook = draftToLocalLook(draft, manualResultId, boardId, importedImageUrl);
        setLooks((current) => draft.id ? current.map((look) => look.id === draft.id ? localLook : look) : [localLook, ...current]);
        setMessage(data.reason ?? "Extracted look kept locally until migration is applied.");
      }
      setDraft(emptyDraft);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save extracted look.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteLook(id: string) {
    if (!window.confirm("Delete this extracted look?")) return;
    if (id.startsWith("local-")) {
      setLooks((current) => current.filter((look) => look.id !== id));
      setMessage("Local extracted look deleted.");
      return;
    }
    const response = await fetch(`/api/prompt-lab/extracted-looks/${id}`, { method: "DELETE" });
    const data = (await response.json()) as { deleted?: boolean; reason?: string | null };
    if (data.deleted) {
      setLooks((current) => current.filter((look) => look.id !== id));
    }
    setMessage(data.deleted ? "Extracted look deleted." : data.reason ?? "Could not delete extracted look.");
    void loadLooks();
  }

  const canUseInBoard = looks.length >= 4;

  return (
    <Card>
      <CardContent className="space-y-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Extract looks from this board</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Manually turn the imported board into reusable looks. AI extraction can come later.
            </p>
          </div>
          {canUseInBoard ? (
            <Button asChildLike="link" href={`/boards/new?source=manual-result&id=${manualResultId}`} variant="outline">
              Create board from extracted looks
            </Button>
          ) : (
            <Button type="button" variant="outline" disabled>
              Create board from extracted looks
            </Button>
          )}
        </div>
        {!canUseInBoard ? <p className="rounded-md border bg-muted/25 p-3 text-sm text-muted-foreground">Add at least 4 extracted looks before starting a mock board from this import.</p> : null}
        {message ? <p className="rounded-md border bg-muted/25 p-3 text-sm text-muted-foreground">{message}</p> : null}

        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div>
            {importedImageUrl ? <img src={importedImageUrl} alt="Imported board source" className="max-h-[360px] w-full rounded-md border bg-muted object-contain p-2" /> : <div className="flex h-72 items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">No imported image available.</div>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title"><Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Linen airport look" /></Field>
            <Field label="Occasion"><Input value={draft.occasion} onChange={(event) => setDraft({ ...draft, occasion: event.target.value })} placeholder="airport / daytime" /></Field>
            <Field label="Fit"><Input value={draft.fit} onChange={(event) => setDraft({ ...draft, fit: event.target.value })} placeholder="relaxed" /></Field>
            <Field label="Color mood"><Input value={draft.colorMood} onChange={(event) => setDraft({ ...draft, colorMood: event.target.value })} placeholder="cream / olive / tan" /></Field>
            <Field label="Items"><Input value={draft.items} onChange={(event) => setDraft({ ...draft, items: event.target.value })} placeholder="camp shirt, tee, trousers" /></Field>
            <Field label="Colors"><Input value={draft.colors} onChange={(event) => setDraft({ ...draft, colors: event.target.value })} placeholder="cream, olive, tan" /></Field>
            <Field label="Footwear"><Input value={draft.footwear} onChange={(event) => setDraft({ ...draft, footwear: event.target.value })} placeholder="sneakers" /></Field>
            <Field label="Accessories"><Input value={draft.accessories} onChange={(event) => setDraft({ ...draft, accessories: event.target.value })} placeholder="sunglasses, tote" /></Field>
            <Field label="Match score"><Input type="number" min={0} max={100} value={draft.matchScore} onChange={(event) => setDraft({ ...draft, matchScore: event.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Why it works"><Textarea value={draft.whyItWorks} onChange={(event) => setDraft({ ...draft, whyItWorks: event.target.value })} placeholder="Relaxed layers and warm neutrals match the trip context." /></Field></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void saveDraft()} disabled={loading}><Plus className="h-4 w-4" />{draft.id ? "Save changes" : "Save look"}</Button>
          <Button type="button" variant="outline" onClick={() => setDraft(emptyDraft)}>Clear</Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {looks.map((look) => (
            <div key={look.id} className="rounded-md border bg-muted/25 p-3">
              <div className="flex flex-wrap gap-2"><Badge>{look.matchScore ?? 82}% match</Badge><Badge>{look.fit || "fit"}</Badge></div>
              <h3 className="mt-3 text-sm font-bold">{look.title}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{look.occasion || "occasion"} / {look.colorMood || "colors"}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{look.items.join(" / ") || "No items yet."}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => editLook(look)}>Edit</Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => void deleteLook(look.id)}><Trash2 className="h-4 w-4" />Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function draftToLocalLook(draft: Draft, manualResultId: string, boardId?: string | null, importedImageUrl?: string | null): ExtractedLook {
  return {
    id: draft.id ?? `local-${Date.now()}`,
    manualResultId,
    boardId,
    title: draft.title.trim(),
    occasion: draft.occasion.trim() || null,
    fit: draft.fit.trim() || null,
    colorMood: draft.colorMood.trim() || null,
    items: splitList(draft.items),
    colors: splitList(draft.colors),
    footwear: splitList(draft.footwear),
    accessories: splitList(draft.accessories),
    whyItWorks: draft.whyItWorks.trim() || null,
    matchScore: Number.isFinite(Number(draft.matchScore)) ? Number(draft.matchScore) : null,
    sourceImageUrl: importedImageUrl,
    sourceCropUrl: null,
    createdAt: new Date().toISOString(),
  };
}

function splitList(value: string) {
  return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
}



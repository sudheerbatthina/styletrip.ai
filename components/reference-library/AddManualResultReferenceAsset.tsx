"use client";

import { type ReactNode, useState } from "react";
import { Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddManualResultReferenceAsset({
  manualResultId,
  boardId,
  importedImageUrl,
}: {
  manualResultId: string;
  boardId?: string | null;
  importedImageUrl?: string | null;
}) {
  const [title, setTitle] = useState("Prompt Lab reference board");
  const [occasionTags, setOccasionTags] = useState("");
  const [styleTags, setStyleTags] = useState("prompt lab, lookbook");
  const [fitTags, setFitTags] = useState("relaxed");
  const [colorTags, setColorTags] = useState("");
  const [itemTags, setItemTags] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function saveReferenceAsset() {
    if (!importedImageUrl) {
      setMessage("Imported image is missing, so it cannot be saved as a reference asset.");
      return;
    }
    if (!title.trim()) {
      setMessage("Add a title before saving to the Reference Library.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/reference-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          source: "manual-chatgpt",
          sourceName: "Prompt Lab Import",
          imageUrl: importedImageUrl,
          occasionTags: splitList(occasionTags),
          styleTags: splitList(styleTags),
          fitTags: splitList(fitTags),
          colorTags: splitList(colorTags),
          itemTags: splitList(itemTags),
          metadata: {
            source: "prompt-lab-result-detail",
            manualResultId,
            boardId: boardId ?? null,
          },
        }),
      });
      const data = (await response.json()) as { saved?: boolean; reason?: string | null };
      setMessage(data.saved ? "Saved to Reference Library." : data.reason ?? "Reference Library setup is needed before saving.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save to Reference Library.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="text-sm font-semibold">Add as reference asset</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Save this manual import into your Reference Library so future Pick Looks can reuse it.
          </p>
        </div>
        {message ? <p className="rounded-md border bg-muted/25 p-3 text-sm text-muted-foreground">{message}</p> : null}
        <Field label="Title"><Input value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
        <Field label="Occasion tags"><Input value={occasionTags} onChange={(event) => setOccasionTags(event.target.value)} placeholder="vacation, dinner, casual" /></Field>
        <Field label="Style tags"><Input value={styleTags} onChange={(event) => setStyleTags(event.target.value)} placeholder="linen, streetwear, resort" /></Field>
        <Field label="Fit tags"><Input value={fitTags} onChange={(event) => setFitTags(event.target.value)} placeholder="relaxed" /></Field>
        <Field label="Color tags"><Input value={colorTags} onChange={(event) => setColorTags(event.target.value)} placeholder="cream, olive, black" /></Field>
        <Field label="Item tags"><Input value={itemTags} onChange={(event) => setItemTags(event.target.value)} placeholder="shirt, trousers, sneakers" /></Field>
        <Button type="button" onClick={() => void saveReferenceAsset()} disabled={loading || !importedImageUrl} className="w-full">
          <Library className="h-4 w-4" />
          Save to Reference Library
        </Button>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function splitList(value: string) {
  return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
}


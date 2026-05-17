"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clipboard, ExternalLink, ImagePlus, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  buildPromptLabPrompt,
  normalizePromptLabPromptVersion,
  promptLabPromptVersions,
  type PromptLabPromptVersion,
} from "@/lib/prompts/prompt-lab";
import type { ImageInput, ReferenceLook } from "@/lib/schemas";

const manualBoardId = "manual";

type SavedPromptLabBoard = {
  id: string;
  title: string;
  tripLocation?: string | null;
  tripType?: string | null;
  sourcePhotoId?: string | null;
  sourcePhotoUrl?: string | null;
  selectedReferenceLooks: ReferenceLook[];
  analysisSummary: string;
  createdAt: string;
};

type ManualPromptResult = {
  id: string;
  boardId?: string | null;
  boardTitle?: string | null;
  promptVersion?: string | null;
  importedImageUrl?: string | null;
  source: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

type ImportResponse = {
  id: string | null;
  persisted: boolean;
  importedImageUrl?: string | null;
  skippedReason?: string | null;
};

type QualityChecklist = {
  resemblesUser: boolean;
  fullBodyVisible: boolean;
  styleVarietyGood: boolean;
  outfitLabelsUseful: boolean;
  boardUsableForDemo: boolean;
};

const defaultChecklist: QualityChecklist = {
  resemblesUser: true,
  fullBodyVisible: true,
  styleVarietyGood: true,
  outfitLabelsUseful: true,
  boardUsableForDemo: true,
};

const qualityLabels: Array<{ id: keyof QualityChecklist; label: string }> = [
  { id: "resemblesUser", label: "Resembles user?" },
  { id: "fullBodyVisible", label: "Full body visible?" },
  { id: "styleVarietyGood", label: "Style variety good?" },
  { id: "outfitLabelsUseful", label: "Outfit labels useful?" },
  { id: "boardUsableForDemo", label: "Board usable for demo?" },
];

const noteOptions = ["not similar enough", "cropped body", "labels hard to read", "too formal", "needs more variety"];

export function PromptLabCard() {
  const searchParams = useSearchParams();
  const [boards, setBoards] = useState<SavedPromptLabBoard[]>([]);
  const [boardsMessage, setBoardsMessage] = useState("");
  const [selectedBoardId, setSelectedBoardId] = useState(manualBoardId);
  const [selectedLookIds, setSelectedLookIds] = useState<string[]>([]);
  const [useSourcePhoto, setUseSourcePhoto] = useState(true);
  const [promptVersion, setPromptVersion] = useState<PromptLabPromptVersion>("v4-chatgpt-style-board");
  const [copyMessage, setCopyMessage] = useState("");
  const [importImage, setImportImage] = useState<ImageInput | null>(null);
  const [importResponse, setImportResponse] = useState<ImportResponse | null>(null);
  const [results, setResults] = useState<ManualPromptResult[]>([]);
  const [resultsMessage, setResultsMessage] = useState("");
  const [qualityStatus, setQualityStatus] = useState<"pass" | "needs_work">("pass");
  const [qualityChecklist, setQualityChecklist] = useState<QualityChecklist>(defaultChecklist);
  const [qualityNotes, setQualityNotes] = useState<string[]>([]);
  const [customQualityNote, setCustomQualityNote] = useState("");
  const [qualityMessage, setQualityMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const activeBoard = useMemo(
    () => boards.find((board) => board.id === selectedBoardId) ?? null,
    [boards, selectedBoardId],
  );
  const selectedLooks = useMemo(
    () => activeBoard?.selectedReferenceLooks.filter((look) => selectedLookIds.includes(look.id)) ?? [],
    [activeBoard, selectedLookIds],
  );
  const generatedPrompt = useMemo(
    () =>
      buildPromptLabPrompt({
        boardTitle: activeBoard?.title ?? "manual StyleTrip prompt",
        tripLocation: activeBoard?.tripLocation,
        tripType: activeBoard?.tripType,
        analysisSummary: activeBoard?.analysisSummary,
        sourcePhotoAvailable: Boolean(useSourcePhoto && activeBoard?.sourcePhotoUrl),
        selectedLooks,
        promptVersion,
      }),
    [activeBoard, promptVersion, selectedLooks, useSourcePhoto],
  );

  useEffect(() => {
    void loadBoards();
    void loadResults();
  }, []);

  useEffect(() => {
    const boardId = searchParams.get("board");
    const version = normalizePromptLabPromptVersion(searchParams.get("promptVersion"));
    if (!boardId || boards.length === 0) return;
    const board = boards.find((item) => item.id === boardId);
    if (!board) return;
    window.setTimeout(() => {
      setSelectedBoardId(board.id);
      setSelectedLookIds(board.selectedReferenceLooks.map((look) => look.id));
      setUseSourcePhoto(Boolean(board.sourcePhotoUrl));
      setPromptVersion(version);
    }, 0);
  }, [boards, searchParams]);

  async function loadBoards() {
    try {
      const response = await fetch("/api/provider-test/boards", { method: "GET", cache: "no-store" });
      const data = (await response.json()) as { boards?: SavedPromptLabBoard[]; available?: boolean; reason?: string | null };
      setBoards(data.boards ?? []);
      setBoardsMessage(data.available === false ? data.reason ?? "" : "");
    } catch {
      setBoardsMessage("Saved boards are unavailable right now.");
    }
  }

  async function loadResults() {
    try {
      const response = await fetch("/api/prompt-lab/results", { method: "GET", cache: "no-store" });
      const data = (await response.json()) as { results?: ManualPromptResult[]; available?: boolean; reason?: string | null };
      setResults(data.results ?? []);
      setResultsMessage(data.available === false ? data.reason ?? "" : "");
    } catch {
      setResultsMessage("Manual import history is unavailable right now.");
    }
  }

  function handleBoardChange(boardId: string) {
    setSelectedBoardId(boardId);
    setImportResponse(null);
    const board = boards.find((item) => item.id === boardId);
    setSelectedLookIds(board?.selectedReferenceLooks.map((look) => look.id) ?? []);
    setUseSourcePhoto(Boolean(board?.sourcePhotoUrl));
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopyMessage("Prompt copied. Paste it into ChatGPT with the source photo if you want to test manually.");
    } catch {
      setCopyMessage("Clipboard copy was blocked. Select the prompt text and copy it manually.");
    }
  }

  async function handleImportFile(file: File | null) {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setImportImage({ dataUrl, mimeType: file.type as ImageInput["mimeType"] });
    setImportResponse(null);
    setQualityMessage("");
  }

  async function importManualResult() {
    if (!importImage) return;
    setLoading(true);
    setImportResponse(null);
    try {
      const response = await fetch("/api/prompt-lab/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId: activeBoard?.id ?? null,
          promptVersion,
          promptUsed: generatedPrompt,
          importedImage: importImage.dataUrl,
          metadata: {
            board_title: activeBoard?.title ?? null,
            selected_look_ids: selectedLooks.map((look) => look.id),
            selected_look_titles: selectedLooks.map((look) => look.title),
            source_photo_available: Boolean(activeBoard?.sourcePhotoUrl),
            source_photo_used_in_manual_workflow: Boolean(useSourcePhoto && activeBoard?.sourcePhotoUrl),
          },
        }),
      });
      const data = (await response.json()) as ImportResponse;
      setImportResponse(data);
      void loadResults();
    } catch (error) {
      setImportResponse({
        id: null,
        persisted: false,
        importedImageUrl: importImage.dataUrl,
        skippedReason: error instanceof Error ? error.message : "Manual import failed.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function saveQuality() {
    if (!importResponse?.id) {
      setQualityMessage("Checklist saved locally for this preview. Persistence requires a saved import.");
      return;
    }
    const response = await fetch("/api/prompt-lab/results", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: importResponse.id,
        quality: {
          status: qualityStatus,
          checklist: qualityChecklist,
          notes: qualityNotes,
          customNote: customQualityNote.trim() || undefined,
          updatedAt: new Date().toISOString(),
        },
      }),
    });
    const data = (await response.json()) as { saved?: boolean; reason?: string | null };
    setQualityMessage(data.saved ? "Checklist saved." : data.reason ?? "Checklist kept locally.");
    void loadResults();
  }

  async function markUseAsInspiration(resultId: string) {
    const response = await fetch("/api/prompt-lab/results", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: resultId, useAsInspiration: true }),
    });
    const data = (await response.json()) as { saved?: boolean; reason?: string | null };
    setResultsMessage(data.saved ? "Marked as board inspiration." : data.reason ?? "Could not update inspiration flag.");
    void loadResults();
  }

  function toggleLook(lookId: string) {
    setSelectedLookIds((current) =>
      current.includes(lookId) ? current.filter((id) => id !== lookId) : [...current, lookId],
    );
  }

  const previewUrl = importResponse?.importedImageUrl ?? importImage?.dataUrl ?? null;

  return (
    <Card className="border-primary/20 bg-background">
      <CardContent className="space-y-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge>Developer/demo</Badge>
              <Badge>No API calls</Badge>
            </div>
            <h2 className="mt-2 text-xl font-bold">Prompt Lab</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Generate a copyable ChatGPT-style prompt, run it manually if desired, then import the result image back into StyleTrip.
            </p>
          </div>
          <Button asChildLike="link" href="/dashboard" variant="outline">Back to dashboard</Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Saved board">
                <Select value={selectedBoardId} onChange={(event) => handleBoardChange(event.target.value)}>
                  <option value={manualBoardId}>Manual prompt only</option>
                  {boards.map((board) => <option key={board.id} value={board.id}>{board.title}</option>)}
                </Select>
                {boardsMessage ? <p className="text-xs text-muted-foreground">{boardsMessage}</p> : null}
              </Field>
              <Field label="Prompt version">
                <Select value={promptVersion} onChange={(event) => setPromptVersion(event.target.value as PromptLabPromptVersion)}>
                  {promptLabPromptVersions.map((version) => <option key={version} value={version}>{version}</option>)}
                </Select>
              </Field>
            </div>

            {activeBoard ? (
              <div className="rounded-md border bg-muted/25 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">Selected reference looks</p>
                    <p className="text-xs text-muted-foreground">{selectedLooks.length} of {activeBoard.selectedReferenceLooks.length} included in the prompt</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelectedLookIds(activeBoard.selectedReferenceLooks.map((look) => look.id))}>Select all</Button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {activeBoard.selectedReferenceLooks.map((look) => (
                    <label key={look.id} className="flex items-start gap-2 rounded-md border bg-background p-2 text-sm leading-5">
                      <input type="checkbox" checked={selectedLookIds.includes(look.id)} onChange={() => toggleLook(look.id)} />
                      <span><span className="font-semibold">{look.title}</span><br /><span className="text-xs text-muted-foreground">{look.fit} / {look.colorMood}</span></span>
                    </label>
                  ))}
                </div>
                {activeBoard.sourcePhotoUrl ? (
                  <label className="mt-3 flex items-center gap-2 rounded-md border bg-background p-2 text-sm">
                    <input type="checkbox" checked={useSourcePhoto} onChange={(event) => setUseSourcePhoto(event.target.checked)} />
                    Include source photo instructions in the prompt
                  </label>
                ) : null}
              </div>
            ) : null}

            <Field label="Copyable prompt">
              <Textarea value={generatedPrompt} readOnly className="min-h-80 font-mono text-xs leading-5" />
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" onClick={() => void copyPrompt()}><Clipboard className="h-4 w-4" />Copy prompt</Button>
                {copyMessage ? <span className="text-xs text-muted-foreground">{copyMessage}</span> : null}
              </div>
            </Field>

            <div className="rounded-md border bg-muted/25 p-3">
              <p className="text-sm font-semibold">Manual result import</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Upload the image you generated manually in ChatGPT. Prompt Lab stores user-provided assets only.</p>
              <div className="mt-3 space-y-3">
                <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleImportFile(event.target.files?.[0] ?? null)} />
                <Button type="button" disabled={!importImage || loading} onClick={() => void importManualResult()}><Upload className="h-4 w-4" />Import manual result</Button>
                {importResponse ? <p className="text-sm text-muted-foreground">{importResponse.persisted ? "Manual result saved." : importResponse.skippedReason ?? "Manual result preview is local only."}</p> : null}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-md border bg-background p-3">
              <p className="text-sm font-semibold">Source context</p>
              {activeBoard ? (
                <div className="mt-2 space-y-2 text-xs leading-5 text-muted-foreground">
                  <p className="font-semibold text-foreground">{activeBoard.title}</p>
                  <p>{activeBoard.tripLocation ?? "Trip"} / {activeBoard.tripType ?? "style"}</p>
                  {activeBoard.sourcePhotoUrl ? <img src={activeBoard.sourcePhotoUrl} alt="Saved source photo" className="h-36 w-full rounded-md border bg-muted object-contain p-1" /> : <p>No saved source photo URL available.</p>}
                </div>
              ) : <p className="mt-2 text-xs text-muted-foreground">Manual prompt fallback.</p>}
            </div>

            <div className="rounded-md border bg-background p-3">
              <p className="text-sm font-semibold">Imported preview</p>
              {previewUrl ? <img src={previewUrl} alt="Manual Prompt Lab import" className="mt-3 max-h-[420px] w-full rounded-md border bg-muted object-contain p-2" /> : <div className="mt-3 flex h-48 items-center justify-center rounded-md border bg-muted text-muted-foreground"><ImagePlus className="h-8 w-8" /></div>}
            </div>
          </div>
        </div>

        {previewUrl ? (
          <div className="rounded-md border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Manual import quality checklist</p>
                <p className="text-xs leading-5 text-muted-foreground">Use this to capture whether the external result is worth future structured extraction.</p>
              </div>
              <div className="flex rounded-md border bg-background p-1">
                <button type="button" className={`rounded px-3 py-1 text-xs font-semibold ${qualityStatus === "pass" ? "bg-emerald-100 text-emerald-900" : "text-muted-foreground"}`} onClick={() => setQualityStatus("pass")}>Pass</button>
                <button type="button" className={`rounded px-3 py-1 text-xs font-semibold ${qualityStatus === "needs_work" ? "bg-amber-100 text-amber-950" : "text-muted-foreground"}`} onClick={() => setQualityStatus("needs_work")}>Needs work</button>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {qualityLabels.map((item) => <label key={item.id} className="flex items-center gap-2 rounded-md border bg-muted/25 p-2 text-sm"><input type="checkbox" checked={qualityChecklist[item.id]} onChange={(event) => setQualityChecklist((current) => ({ ...current, [item.id]: event.target.checked }))} />{item.label}</label>)}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {noteOptions.map((note) => {
                const active = qualityNotes.includes(note);
                return <button key={note} type="button" className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-primary bg-primary/10 text-primary" : "bg-background text-muted-foreground"}`} onClick={() => setQualityNotes((current) => active ? current.filter((item) => item !== note) : [...current, note])}>{note}</button>;
              })}
            </div>
            <Field label="Custom note"><Textarea value={customQualityNote} onChange={(event) => setCustomQualityNote(event.target.value)} placeholder="Optional notes about prompt/result quality" /></Field>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={() => void saveQuality()}><CheckCircle2 className="h-4 w-4" />Save checklist</Button>
              {importResponse?.id ? <Button type="button" variant="outline" onClick={() => void markUseAsInspiration(importResponse.id!)}>Use as inspiration</Button> : null}
              {qualityMessage ? <span className="text-xs text-muted-foreground">{qualityMessage}</span> : null}
            </div>
          </div>
        ) : null}

        <div className="rounded-md border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Recent manual imports</p>
              <p className="text-xs leading-5 text-muted-foreground">Persistence requires the optional manual_prompt_results migration.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadResults()}>Refresh imports</Button>
          </div>
          {resultsMessage ? <p className="mt-3 text-sm text-muted-foreground">{resultsMessage}</p> : null}
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {results.map((result) => (
              <div key={result.id} className="rounded-md border p-3">
                {result.importedImageUrl ? <img src={result.importedImageUrl} alt="Manual prompt result" className="aspect-[4/3] w-full rounded border bg-muted object-contain p-1" /> : <div className="flex aspect-[4/3] items-center justify-center rounded border bg-muted text-muted-foreground"><ImagePlus className="h-5 w-5" /></div>}
                <div className="mt-3 flex flex-wrap gap-1"><Badge>{result.promptVersion ?? "prompt"}</Badge>{result.boardTitle ? <Badge>{result.boardTitle}</Badge> : null}</div>
                <p className="mt-2 text-xs text-muted-foreground">{new Date(result.createdAt).toLocaleString()}</p>
                <p className="mt-2 text-xs text-muted-foreground">Extracted looks: {getExtractedLookCount(result)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="ghost" size="sm" asChildLike="link" href={`/dashboard/prompt-lab/results/${result.id}`} className="px-0"><ExternalLink className="h-3.5 w-3.5" />Extract looks</Button>
                  {getExtractedLookCount(result) >= 4 ? <Button type="button" variant="outline" size="sm" asChildLike="link" href={`/boards/new?source=manual-result&id=${result.id}`}>Use in board</Button> : null}
                  <Button type="button" variant="outline" size="sm" onClick={() => void markUseAsInspiration(result.id)}>Use as inspiration</Button>
                </div>
              </div>
            ))}
          </div>
          {!results.length && !resultsMessage ? <p className="mt-3 text-sm text-muted-foreground">No manual imports yet.</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function getExtractedLookCount(result: ManualPromptResult) {
  const count = result.metadata?.extractedLookCount;
  return typeof count === "number" ? count : 0;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}




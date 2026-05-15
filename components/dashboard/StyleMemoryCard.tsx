"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { emptyStyleMemory } from "@/lib/feedback/feedback-memory";
import type { StyleMemorySummary } from "@/lib/schemas";

type StyleMemoryResponse = {
  available?: boolean;
  memory?: StyleMemorySummary;
};

export function StyleMemoryCard() {
  return (
    <ToastProvider>
      <StyleMemoryCardContent />
    </ToastProvider>
  );
}

function StyleMemoryCardContent() {
  const { toast } = useToast();
  const [memory, setMemory] = useState<StyleMemorySummary>(emptyStyleMemory);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  async function loadMemory() {
    setLoading(true);
    try {
      const response = await fetch("/api/style-feedback", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        setAvailable(false);
        return;
      }
      const data = (await response.json()) as StyleMemoryResponse;
      setMemory(data.memory ?? emptyStyleMemory);
      setAvailable(data.available ?? true);
    } catch {
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  }

  async function resetMemory() {
    if (!window.confirm("Reset your Style Memory? This clears saved feedback signals.")) {
      return;
    }

    setResetting(true);
    try {
      const response = await fetch("/api/style-feedback", { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Reset failed.");
      }
      setMemory(emptyStyleMemory);
      toast({
        title: "Style Memory reset",
        description: "Future boards will start fresh until new feedback is saved.",
      });
    } catch (error) {
      toast({
        title: "Could not reset Style Memory",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setResetting(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadMemory();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Style Memory</p>
            <h2 className="text-xl font-bold">Your learned style signals</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Used to rank future reference looks in mock/curated mode.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void loadMemory()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void resetMemory()}
              disabled={resetting}
            >
              <Trash2 className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        {!available ? (
          <p className="rounded-md border bg-muted/35 p-3 text-sm text-muted-foreground">
            Style Memory is local-only until the feedback migration is run.
          </p>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <MemoryGroup title="Liked colors" items={memory.likedColors} loading={loading} />
          <MemoryGroup title="Disliked colors" items={memory.dislikedColors} loading={loading} />
          <MemoryGroup title="Liked fits" items={memory.likedFits} loading={loading} />
          <MemoryGroup title="Disliked fits" items={memory.dislikedFits} loading={loading} />
          <MemoryGroup title="Recent selected styles" items={memory.likedTitles} loading={loading} />
          <MemoryGroup title="Recent rejected styles" items={memory.dislikedTitles} loading={loading} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge>Selected {memory.selectedCount}</Badge>
          <Badge>Rejected {memory.rejectedCount}</Badge>
          <Badge>Saved {memory.savedCount}</Badge>
          <Badge>Downloaded {memory.downloadedCount}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function MemoryGroup({
  title,
  items,
  loading,
}: {
  title: string;
  items: string[];
  loading: boolean;
}) {
  return (
    <div className="rounded-md border bg-muted/25 p-3">
      <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        {title}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {loading ? <Badge>Loading</Badge> : null}
        {!loading && items.length === 0 ? <Badge>None yet</Badge> : null}
        {items.slice(0, 6).map((item) => (
          <Badge key={item} className="bg-background text-foreground">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ProviderStatus = {
  mockMode: boolean;
  paidGenerationEnabled: boolean;
  referenceProvider: string;
  referenceProviderCacheEnabled: boolean;
  referenceProviderMaxResults: number;
  referenceProviderTimeoutMs: number;
  referenceFallbackBehavior: string;
  textProvider: string;
  imageProvider: string;
  fallbackImageProvider: string | null;
  maxRealImagesPerBoard: number;
  maxRealTestImages: number;
  maxEstimatedCostPerBoardUsd: number;
  missingKeys: Record<string, boolean>;
};

const showProviderStatus =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_MOCK_MODE === "true";

export function ProviderStatusCard() {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadStatus() {
    setLoading(true);
    try {
      const response = await fetch("/api/provider-status?imageCount=1", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }
      setStatus((await response.json()) as ProviderStatus);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!showProviderStatus) {
      return;
    }
    const timeout = window.setTimeout(() => {
      void loadStatus();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  if (!showProviderStatus) {
    return null;
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Provider Status</p>
            <h2 className="text-xl font-bold">Safe generation configuration</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Development-only status. No secrets or API keys are exposed.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadStatus()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <StatusLine label="Mock mode" value={status?.mockMode ? "on" : "off"} loading={loading} />
          <StatusLine label="Reference" value={status?.referenceProvider ?? "unknown"} loading={loading} />
          <StatusLine
            label="Reference cache"
            value={status?.referenceProviderCacheEnabled ? "enabled" : "disabled"}
            loading={loading}
          />
          <StatusLine
            label="Max refs"
            value={String(status?.referenceProviderMaxResults ?? 24)}
            loading={loading}
          />
          <StatusLine
            label="Ref timeout"
            value={`${status?.referenceProviderTimeoutMs ?? 8000}ms`}
            loading={loading}
          />
          <StatusLine label="Text provider" value={status?.textProvider ?? "unknown"} loading={loading} />
          <StatusLine label="Image provider" value={status?.imageProvider ?? "unknown"} loading={loading} />
          <StatusLine
            label="Paid generation"
            value={status?.paidGenerationEnabled ? "enabled" : "disabled"}
            loading={loading}
          />
          <StatusLine
            label="Fallback"
            value={status?.fallbackImageProvider ?? "none"}
            loading={loading}
          />
          <StatusLine
            label="Max images"
            value={String(status?.maxRealImagesPerBoard ?? 0)}
            loading={loading}
          />
          <StatusLine
            label="Max test images"
            value={String(status?.maxRealTestImages ?? 1)}
            loading={loading}
          />
          <StatusLine
            label="Max cost"
            value={`$${(status?.maxEstimatedCostPerBoardUsd ?? 0).toFixed(2)}`}
            loading={loading}
          />
        </div>

        <div className="rounded-md border bg-muted/25 p-3">
          <div className="flex items-start gap-2 text-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-muted-foreground">
              Paid providers stay blocked unless ENABLE_PAID_IMAGE_GENERATION=true.
              Missing keys are shown only as booleans.
              {status?.referenceFallbackBehavior ? ` ${status.referenceFallbackBehavior}` : ""}
            </p>
          </div>
          {status ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(status.missingKeys).map(([key, missing]) => (
                <Badge key={key} className="bg-background text-foreground">
                  {key}: {missing ? "missing" : "configured"}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusLine({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-md border bg-muted/25 p-3">
      <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-bold">{loading ? "Loading" : value}</p>
    </div>
  );
}

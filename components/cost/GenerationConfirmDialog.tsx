"use client";

import { AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CostEstimate } from "@/lib/cost/cost-estimator";

export function GenerationConfirmDialog({
  estimate,
  open,
  loading,
  onCancel,
  onConfirm,
}: {
  estimate: CostEstimate;
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-md rounded-lg border bg-background p-5 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Confirm real generation</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Personalized image generation will only run after this confirmation.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <ConfirmLine label="Provider" value={estimate.imageProvider} />
          <ConfirmLine label="Images" value={String(estimate.numberOfImages)} />
          <ConfirmLine label="Text est." value={formatUsd(estimate.estimatedTextCostUsd)} />
          <ConfirmLine label="Image est." value={formatUsd(estimate.estimatedImageCostUsd)} />
          <ConfirmLine label="Total" value={formatUsd(estimate.estimatedTotalCostUsd)} />
          <ConfirmLine label="Limit" value={formatUsd(estimate.maxAllowedCostUsd)} />
        </div>

        <p className="mt-4 rounded-md border bg-muted/35 p-3 text-xs leading-5 text-muted-foreground">
          {estimate.reason}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={loading || !estimate.isAllowed}>
            <Sparkles className="h-4 w-4" />
            Confirm and generate
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/25 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}

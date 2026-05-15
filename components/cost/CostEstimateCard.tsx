"use client";

import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { CostEstimate } from "@/lib/cost/cost-estimator";

export type CostEstimateCardProps = {
  estimate: CostEstimate;
};

export function CostEstimateCard({ estimate }: CostEstimateCardProps) {
  const isMock = estimate.mode === "mock";
  const isBlocked = estimate.mode === "blocked";

  return (
    <Card className={isBlocked ? "border-destructive/35 bg-destructive/5" : "bg-muted/25"}>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Estimated generation cost</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isMock
                ? "Mock mode: $0. No paid APIs will be called."
                : isBlocked
                  ? estimate.reason
                  : "Cost confirmation will be required before generation."}
            </p>
          </div>
          <Badge className={isMock ? "bg-primary text-primary-foreground" : "bg-background text-foreground"}>
            {isMock ? "$0" : isBlocked ? "Blocked" : "Estimate"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <CostLine label="Image provider" value={estimate.imageProvider} />
          <CostLine label="Text provider" value={estimate.textProvider} />
          <CostLine label="Images" value={String(estimate.numberOfImages)} />
          <CostLine label="Text" value={formatUsd(estimate.estimatedTextCostUsd)} />
          <CostLine label="Image est." value={formatUsd(estimate.estimatedImageCostUsd)} />
          <CostLine label="Total" value={formatUsd(estimate.estimatedTotalCostUsd)} strong />
          <CostLine label="Limit" value={formatUsd(estimate.maxAllowedCostUsd)} />
          <CostLine label="State" value={estimate.mode} />
        </div>

        <div className="flex gap-2 rounded-md border bg-background/70 p-3 text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            {isMock
              ? "Mock mode uses local demo assets and keeps estimated cost at $0."
              : isBlocked
                ? "ENABLE_PAID_IMAGE_GENERATION must be true before real providers can run."
                : estimate.reason}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CostLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-md border bg-background p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={strong ? "font-bold" : "font-semibold"}>{value}</p>
    </div>
  );
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}

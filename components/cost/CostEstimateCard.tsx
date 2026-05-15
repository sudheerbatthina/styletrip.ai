"use client";

import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export type CostEstimateStatus = "mock" | "blocked" | "allowed";

export type CostEstimateCardProps = {
  provider: string;
  imageCount: number;
  estimatedTextCostUsd?: number;
  estimatedImageCostUsd?: number;
  totalEstimateUsd: number;
  maxAllowedCostUsd: number;
  status: CostEstimateStatus;
};

export function CostEstimateCard({
  provider,
  imageCount,
  estimatedTextCostUsd = 0,
  estimatedImageCostUsd = 0,
  totalEstimateUsd,
  maxAllowedCostUsd,
  status,
}: CostEstimateCardProps) {
  const isMock = status === "mock";
  const isBlocked = status === "blocked";

  return (
    <Card className={isBlocked ? "border-destructive/35 bg-destructive/5" : "bg-muted/25"}>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Estimated generation cost</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isMock
                ? "No paid APIs will be called."
                : isBlocked
                  ? "Paid generation is disabled by default."
                  : "Cost confirmation will be required before generation."}
            </p>
          </div>
          <Badge className={isMock ? "bg-primary text-primary-foreground" : "bg-background text-foreground"}>
            {isMock ? "$0" : isBlocked ? "Blocked" : "Estimate"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <CostLine label="Provider" value={provider} />
          <CostLine label="Images" value={String(imageCount)} />
          <CostLine label="Text" value={formatUsd(estimatedTextCostUsd)} />
          <CostLine label="Image est." value={formatUsd(estimatedImageCostUsd)} />
          <CostLine label="Total" value={formatUsd(totalEstimateUsd)} strong />
          <CostLine label="Limit" value={formatUsd(maxAllowedCostUsd)} />
        </div>

        <div className="flex gap-2 rounded-md border bg-background/70 p-3 text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            {isMock
              ? "Mock mode uses local demo assets and keeps estimated cost at $0."
              : "ENABLE_PAID_IMAGE_GENERATION must be true before real providers can run."}
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
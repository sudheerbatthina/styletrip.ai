"use client";

import { Check, Shirt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { StyleCardData } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function StyleCard({
  style,
  selected,
  disabled,
  onToggle,
}: {
  style: StyleCardData;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled && !selected}
      onClick={onToggle}
      className="focus-ring h-full w-full rounded-lg text-left disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Card
        className={cn(
          "h-full border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/60",
          selected && "border-primary ring-2 ring-primary/20",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <Shirt className="h-5 w-5 text-primary" />
            </span>
            <div>
              <h3 className="text-sm font-bold">{style.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{style.vibe}</p>
            </div>
          </div>
          {selected ? (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-4 w-4" />
            </span>
          ) : null}
        </div>

        <p className="mt-3 text-sm leading-5 text-muted-foreground">
          {style.whyItFitsUser}
        </p>

        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {style.colors.slice(0, 4).map((color) => (
              <Badge key={color}>{color}</Badge>
            ))}
          </div>
          <div className="text-xs leading-5 text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Best for:</span>{" "}
              {style.bestFor}
            </p>
            <p>
              <span className="font-semibold text-foreground">Items:</span>{" "}
              {style.items.slice(0, 3).join(", ")}
            </p>
          </div>
        </div>
      </Card>
    </button>
  );
}

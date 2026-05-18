"use client";

/* eslint-disable @next/next/no-img-element */

import { Check, ThumbsDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  emptyStyleMemory,
  scoreLookWithStyleMemory,
} from "@/lib/feedback/feedback-memory";
import type { ReferenceFeedback, ReferenceLook, StyleMemorySummary } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function ReferenceLookCard({
  look,
  selected,
  disabled,
  feedback,
  styleMemory = emptyStyleMemory,
  showDebug,
  onToggle,
  onFeedback,
}: {
  look: ReferenceLook;
  selected: boolean;
  disabled?: boolean;
  feedback: ReferenceFeedback;
  styleMemory?: StyleMemorySummary;
  showDebug?: boolean;
  onToggle: () => void;
  onFeedback: (kind: keyof ReferenceFeedback, id: string) => void;
}) {
  const disliked = feedback.notMyStyle.includes(look.id);
  const memoryScore = scoreLookWithStyleMemory(look, styleMemory);
  const matchTags = look.matchTags.slice(0, 2);
  const whyThisWorks = look.whyThisMatches[0] ?? look.whyItFits;
  const matchScore = Math.max(
    0,
    Math.round(look.overallMatchScore - (disliked ? 32 : 0)),
  );
  const sourceLabel = look.sourceName || look.source;
  const attribution = look.attributionText || (look.photographer ? `Photo by ${look.photographer}` : "");
  const debugBaseScore = Math.max(
    0,
    Math.min(100, memoryScore.baseScore - memoryScore.feedbackBoost + memoryScore.feedbackPenalty),
  );

  return (
    <Card
      className={cn(
        "overflow-hidden border bg-card transition",
        selected && "border-2 border-primary bg-primary/5 ring-2 ring-primary/25",
        disliked && !selected && "opacity-60",
      )}
    >
      <div className="relative aspect-[3/4] bg-[#f4ecdf]">
        <img
          src={look.referenceImageUrl}
          alt={`${look.title} reference look`}
          className={cn(
            "h-full w-full",
            look.source === "stock" ? "object-cover p-0" : "object-contain p-2",
          )}
        />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          <Badge className="bg-background/95 text-foreground">{look.occasion}</Badge>
          <Badge className="bg-background/95 text-foreground">{look.fit}</Badge>
        </div>
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1.5">
          <Badge className="bg-background/95 text-foreground shadow-sm">
            {matchScore}% match
          </Badge>
          <Badge className="bg-background/95 text-foreground shadow-sm">
            {sourceLabel}
          </Badge>
        </div>
        {selected ? (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground shadow-soft">
            <Check className="h-4 w-4" />
            Selected
          </span>
        ) : null}
        {disliked && !selected ? (
          <span className="absolute right-2 top-2 rounded-full bg-destructive px-2 py-1 text-xs font-semibold text-destructive-foreground shadow-soft">
            Downranked
          </span>
        ) : null}
      </div>

      <div className="space-y-2.5 p-3">
        <div>
          <h3 className="line-clamp-1 text-sm font-bold">{look.title}</h3>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{look.colorMood}</p>
        </div>

        {matchTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {matchTags.map((tag) => (
              <Badge key={tag} className="bg-background text-foreground">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}

        <p className="line-clamp-1 text-sm text-muted-foreground">
          {look.items.slice(0, 3).join(" / ")}
        </p>
        {attribution ? (
          <p className="text-xs text-muted-foreground">
            {look.sourceUrl ? (
              <a href={look.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
                {attribution}
              </a>
            ) : (
              attribution
            )}
          </p>
        ) : null}

        <details className="rounded-md border bg-muted/25 p-2 text-xs leading-5 text-muted-foreground">
          <summary className="cursor-pointer font-semibold text-foreground">Why this works</summary>
          <p className="mt-1 line-clamp-3">{whyThisWorks}</p>
        </details>

        {showDebug ? (
          <details className="rounded-md border bg-background p-3 text-xs leading-5 text-muted-foreground">
            <summary className="cursor-pointer font-semibold text-foreground">
              Why ranked this way
            </summary>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <span>Base {debugBaseScore}</span>
              <span>Boost +{memoryScore.feedbackBoost}</span>
              <span>Penalty -{memoryScore.feedbackPenalty + (disliked ? 32 : 0)}</span>
            </div>
            <p className="mt-2 font-semibold text-foreground">
              Final {matchScore}% match
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {(memoryScore.reasons.length > 0
                ? memoryScore.reasons
                : look.whyThisMatches
              )
                .slice(0, 3)
                .map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
            </ul>
          </details>
        ) : null}
      </div>

      <div className="grid gap-2 border-t bg-muted/25 p-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Button
          type="button"
          className="w-full"
          variant={selected ? "default" : "secondary"}
          onClick={onToggle}
          disabled={disabled && !selected}
          aria-pressed={selected}
        >
          <Check className="h-4 w-4" />
          {selected ? "Selected" : "Select Look"}
        </Button>
        <Button
          type="button"
          variant={disliked ? "destructive" : "outline"}
          onClick={() => onFeedback("notMyStyle", look.id)}
          aria-pressed={disliked}
        >
          <ThumbsDown className="h-4 w-4" />
          Not my style
        </Button>
      </div>
    </Card>
  );
}

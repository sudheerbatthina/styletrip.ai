"use client";

/* eslint-disable @next/next/no-img-element */

import { Check, ImagePlus, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ReferenceLook } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export type ReferenceFeedback = {
  moreLikeThis: string[];
  notMyStyle: string[];
  generateLater: string[];
};

export function ReferenceLookCard({
  look,
  selected,
  disabled,
  feedback,
  onToggle,
  onFeedback,
}: {
  look: ReferenceLook;
  selected: boolean;
  disabled?: boolean;
  feedback: ReferenceFeedback;
  onToggle: () => void;
  onFeedback: (kind: keyof ReferenceFeedback, id: string) => void;
}) {
  const liked = feedback.moreLikeThis.includes(look.id);
  const disliked = feedback.notMyStyle.includes(look.id);
  const generateLater = feedback.generateLater.includes(look.id);

  return (
    <Card
      className={cn(
        "overflow-hidden border bg-card transition",
        selected && "border-primary ring-2 ring-primary/20",
        disliked && "opacity-60",
      )}
    >
      <button
        type="button"
        disabled={disabled && !selected}
        onClick={onToggle}
        className="focus-ring block w-full text-left disabled:cursor-not-allowed disabled:opacity-60"
        aria-pressed={selected}
      >
        <div className="relative aspect-[4/5] bg-muted">
          <img
            src={look.referenceImageUrl}
            alt={`${look.title} reference look`}
            className="h-full w-full object-cover"
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <Badge className="bg-background/95 text-foreground">{look.occasion}</Badge>
            <Badge className="bg-background/95 text-foreground">{look.fit}</Badge>
          </div>
          {selected ? (
            <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft">
              <Check className="h-5 w-5" />
            </span>
          ) : null}
        </div>
        <div className="space-y-3 p-4">
          <div>
            <h3 className="text-base font-bold">{look.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{look.colorMood}</p>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {look.items.slice(0, 4).join(" / ")}
          </p>
          <p className="text-sm leading-6">{look.whyItFits}</p>
        </div>
      </button>

      <div className="grid grid-cols-1 gap-2 border-t bg-muted/25 p-3">
        <Button
          type="button"
          size="sm"
          variant={liked ? "default" : "outline"}
          onClick={() => onFeedback("moreLikeThis", look.id)}
        >
          <ThumbsUp className="h-4 w-4" />
          More like this
        </Button>
        <Button
          type="button"
          size="sm"
          variant={disliked ? "destructive" : "outline"}
          onClick={() => onFeedback("notMyStyle", look.id)}
        >
          <ThumbsDown className="h-4 w-4" />
          Not my style
        </Button>
        <Button
          type="button"
          size="sm"
          variant={generateLater ? "secondary" : "outline"}
          onClick={() => onFeedback("generateLater", look.id)}
        >
          {generateLater ? <Sparkles className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
          Generate this on me later
        </Button>
      </div>
    </Card>
  );
}



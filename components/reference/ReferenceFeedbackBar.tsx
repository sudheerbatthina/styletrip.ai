"use client";

import { Badge } from "@/components/ui/badge";
import type { ReferenceFeedback } from "@/components/reference/ReferenceLookCard";

export function ReferenceFeedbackBar({ feedback }: { feedback: ReferenceFeedback }) {
  const items = [
    ["More like this", feedback.moreLikeThis.length],
    ["Not my style", feedback.notMyStyle.length],
  ] as const;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(([label, count]) => (
        <Badge key={label}>
          {label}: {count}
        </Badge>
      ))}
    </div>
  );
}


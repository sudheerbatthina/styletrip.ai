"use client";

import { Badge } from "@/components/ui/badge";
import type { ReferenceFeedback } from "@/lib/schemas";

export function ReferenceFeedbackBar({
  feedback,
  selectedCount,
}: {
  feedback: ReferenceFeedback;
  selectedCount: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge>Selected: {selectedCount}</Badge>
      <Badge>Not my style: {feedback.notMyStyle.length}</Badge>
      <Badge>Refreshed: {feedback.refreshCount}</Badge>
    </div>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import type { ReferenceFeedback } from "@/components/reference/ReferenceLookCard";

export function ReferenceFeedbackBar({ feedback }: { feedback: ReferenceFeedback }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge>Not my style: {feedback.notMyStyle.length}</Badge>
    </div>
  );
}
"use client";

import { ReferenceLookCard } from "@/components/reference/ReferenceLookCard";
import type { ReferenceFeedback, ReferenceLook, StyleMemorySummary } from "@/lib/schemas";

export function ReferenceLookGrid({
  looks,
  selectedIds,
  feedback,
  styleMemory,
  showDebug,
  onToggle,
  onFeedback,
}: {
  looks: ReferenceLook[];
  selectedIds: string[];
  feedback: ReferenceFeedback;
  styleMemory?: StyleMemorySummary;
  showDebug?: boolean;
  onToggle: (id: string) => void;
  onFeedback: (kind: keyof ReferenceFeedback, id: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {looks.map((look) => (
        <ReferenceLookCard
          key={look.id}
          look={look}
          selected={selectedIds.includes(look.id)}
          feedback={feedback}
          styleMemory={styleMemory}
          showDebug={showDebug}
          onToggle={() => onToggle(look.id)}
          onFeedback={onFeedback}
        />
      ))}
    </div>
  );
}

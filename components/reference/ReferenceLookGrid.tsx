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
  onSaveToLibrary,
}: {
  looks: ReferenceLook[];
  selectedIds: string[];
  feedback: ReferenceFeedback;
  styleMemory?: StyleMemorySummary;
  showDebug?: boolean;
  onToggle: (id: string) => void;
  onFeedback: (kind: keyof ReferenceFeedback, id: string) => void;
  onSaveToLibrary?: (look: ReferenceLook) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
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
          onSaveToLibrary={onSaveToLibrary}
        />
      ))}
    </div>
  );
}


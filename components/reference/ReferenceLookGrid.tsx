"use client";

import { ReferenceLookCard, type ReferenceFeedback } from "@/components/reference/ReferenceLookCard";
import type { ReferenceLook } from "@/lib/schemas";

export function ReferenceLookGrid({
  looks,
  selectedIds,
  feedback,
  onToggle,
  onFeedback,
}: {
  looks: ReferenceLook[];
  selectedIds: string[];
  feedback: ReferenceFeedback;
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
          onToggle={() => onToggle(look.id)}
          onFeedback={onFeedback}
        />
      ))}
    </div>
  );
}

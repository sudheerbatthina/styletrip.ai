import { getManualExtractedLooksAsReferenceLooks } from "@/lib/prompt-lab/manual-extracted-looks";
import type { ReferenceLook } from "@/lib/schemas";

export async function getManualImportReferenceLooks(manualResultId: string) {
  return getManualExtractedLooksAsReferenceLooks(manualResultId);
}

export function markManualImportLooks(looks: ReferenceLook[]) {
  return looks.map((look) => ({
    ...look,
    source: "manual" as const,
    sourceName: look.sourceName || "Prompt Lab Import",
    attributionText: look.attributionText || "Manual Prompt Lab import",
    matchTags: Array.from(new Set(["Prompt Lab import", ...look.matchTags])).slice(0, 4),
  }));
}

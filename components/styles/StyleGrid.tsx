"use client";

import { StyleCard } from "@/components/styles/StyleCard";
import type { StyleCardData } from "@/lib/schemas";

const groups = [
  {
    title: "Street & Casual",
    match: ["street", "denim", "varsity", "skater", "sneakerhead", "night market"],
  },
  {
    title: "Resort & Pool",
    match: ["resort", "crochet", "ombre", "cutwork", "pool", "old-money"],
  },
  {
    title: "Vegas Night & Photo",
    match: ["bowling", "racing", "western", "satin", "scarf", "photo-friendly"],
  },
  {
    title: "Travel & Utility",
    match: ["minimal", "utility", "bomber", "hoodie", "airport", "monochrome"],
  },
];

function getGroup(style: StyleCardData) {
  const search = `${style.title} ${style.vibe}`.toLowerCase();
  return groups.find((group) =>
    group.match.some((term) => search.includes(term)),
  )?.title ?? "More Ideas";
}

export function StyleGrid({
  styles,
  selectedIds,
  maxSelected,
  onToggle,
}: {
  styles: StyleCardData[];
  selectedIds: string[];
  maxSelected: number;
  onToggle: (id: string) => void;
}) {
  const groupedStyles = groups
    .map((group) => ({
      title: group.title,
      styles: styles.filter((style) => getGroup(style) === group.title),
    }))
    .filter((group) => group.styles.length > 0);

  return (
    <div className="space-y-8">
      {groupedStyles.map((group) => (
        <section key={group.title} className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-lg font-bold">{group.title}</h2>
            <p className="text-xs text-muted-foreground">
              Select up to {maxSelected}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.styles.map((style) => (
              <StyleCard
                key={style.id}
                style={style}
                selected={selectedIds.includes(style.id)}
                disabled={selectedIds.length >= maxSelected}
                onToggle={() => onToggle(style.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

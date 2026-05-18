"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ReferenceAsset = {
  id: string;
  title: string;
  displayImageUrl?: string | null;
  imageUrl?: string | null;
  sourceName?: string | null;
  source: string;
};

export function ReferenceLibraryCard() {
  const [assets, setAssets] = useState<ReferenceAsset[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAssets() {
      try {
        const response = await fetch("/api/reference-assets?limit=6", { cache: "no-store" });
        const data = (await response.json()) as { assets?: ReferenceAsset[]; available?: boolean; reason?: string | null };
        setAssets(data.assets ?? []);
        setMessage(data.available === false ? data.reason ?? "Reference Library setup is incomplete." : "");
      } catch {
        setMessage("Reference Library could not load.");
      }
    }
    void loadAssets();
  }, []);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Reference Library</p>
            <h2 className="text-xl font-bold">Reusable photo references</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Upload and tag model-style photos so Pick Looks can show real references before illustration fallback.
            </p>
          </div>
          <Button asChildLike="link" href="/dashboard/reference-library" variant="outline">
            <ImagePlus className="h-4 w-4" />
            Open Library
          </Button>
        </div>

        {message ? <p className="rounded-md border bg-muted/25 p-3 text-sm text-muted-foreground">{message}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Badge>{assets.length} recent assets</Badge>
          <Badge>Bucket: reference-assets</Badge>
        </div>

        {assets.length ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {assets.map((asset) => (
              <div key={asset.id} className="overflow-hidden rounded-md border bg-muted/40">
                {asset.displayImageUrl || asset.imageUrl ? (
                  <img src={asset.displayImageUrl ?? asset.imageUrl ?? ""} alt={asset.title} className="aspect-square w-full object-cover" />
                ) : (
                  <div className="aspect-square" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md border bg-muted/25 p-3 text-sm text-muted-foreground">
            No uploaded references yet. The app will keep using public/static references and illustration fallback.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

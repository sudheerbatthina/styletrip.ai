"use client";

import Image from "next/image";
import { ImagePlus, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { fileToDataUrl, validateImageFile } from "@/lib/image-utils";
import type { ImageInput } from "@/lib/schemas";

export function PhotoUploader({
  value,
  onChange,
  onError,
}: {
  value: ImageInput | null;
  onChange: (image: ImageInput) => void;
  onError: (message: string) => void;
}) {
  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }

    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      onError(validationMessage);
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      onChange({
        dataUrl,
        mimeType: file.type as ImageInput["mimeType"],
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not read image.");
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="space-y-4">
          <Label htmlFor="photo">Full-body photo</Label>
          <label
            htmlFor="photo"
            className="focus-ring flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-muted/45 p-4 text-center transition hover:bg-muted"
          >
            {value ? (
              <div className="relative aspect-[3/4] w-full max-w-sm overflow-hidden rounded-lg border bg-background">
                <Image
                  src={value.dataUrl}
                  alt="Uploaded outfit reference preview"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex max-w-sm flex-col items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-background">
                  <ImagePlus className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-base font-semibold">Upload JPG, PNG, or WEBP</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Use a clear full-body image for better outfit suggestions.
                  </p>
                </div>
              </div>
            )}
          </label>
          <input
            id="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <div className="flex flex-col gap-3 rounded-lg border bg-background p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent" />
              Your photo is used only to generate style suggestions for this session.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("photo")?.click()}
            >
              <Upload className="h-4 w-4" />
              Choose Photo
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

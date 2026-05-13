"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { preferencesSchema, type Preferences } from "@/lib/schemas";

const occasions = [
  "airport",
  "daytime walking",
  "pool",
  "dinner",
  "club",
  "photoshoot",
  "casual night",
  "luxury casual",
];

export const defaultPreferences: Preferences = {
  height: "",
  tripLocation: "Las Vegas",
  tripType: "vacation",
  genderStyleDirection: "men's vacation style",
  budgetRange: "mid-range",
  preferredFit: "relaxed",
  dislikedStyles: "",
  favoriteColors: "",
  occasionTypes: ["airport", "daytime walking", "dinner", "casual night"],
  aspectRatio: "1:1",
  numberOfStyleIdeas: 12,
  usePhotoReferenceConsent: false,
  resemblanceMode: "strong",
};

export function PreferenceForm({
  defaultValues = defaultPreferences,
  onSubmit,
  submitLabel = "Analyze Photo",
  disabled = false,
}: {
  defaultValues?: Preferences;
  onSubmit: (preferences: Preferences) => void;
  submitLabel?: string;
  disabled?: boolean;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Preferences>({
    resolver: zodResolver(preferencesSchema),
    defaultValues,
  });

  const [selectedOccasions, setSelectedOccasions] = useState<string[]>(
    defaultValues.occasionTypes,
  );

  function toggleOccasion(occasion: string) {
    const next = selectedOccasions.includes(occasion)
      ? selectedOccasions.filter((item) => item !== occasion)
      : [...selectedOccasions, occasion];
    setSelectedOccasions(next);
    setValue("occasionTypes", next, { shouldDirty: true, shouldValidate: true });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Height" error={errors.height?.message}>
          <Input placeholder="5'7&quot; or 170 cm" {...register("height")} />
        </Field>
        <Field label="Trip location" error={errors.tripLocation?.message}>
          <Input {...register("tripLocation")} />
        </Field>
        <Field label="Trip type" error={errors.tripType?.message}>
          <Input {...register("tripType")} />
        </Field>
        <Field
          label="Gender/style direction"
          error={errors.genderStyleDirection?.message}
        >
          <Input {...register("genderStyleDirection")} />
        </Field>
        <Field label="Budget range" error={errors.budgetRange?.message}>
          <Input placeholder="budget, mid-range, luxury" {...register("budgetRange")} />
        </Field>
        <Field label="Preferred fit" error={errors.preferredFit?.message}>
          <Select {...register("preferredFit")}>
            <option value="slim">Slim</option>
            <option value="regular">Regular</option>
            <option value="relaxed">Relaxed</option>
            <option value="oversized">Oversized</option>
          </Select>
        </Field>
        <Field label="Aspect ratio" error={errors.aspectRatio?.message}>
          <Select {...register("aspectRatio")}>
            <option value="1:1">1:1 square</option>
            <option value="4:5">4:5 portrait</option>
            <option value="16:9">16:9 wide</option>
          </Select>
        </Field>
        <Field label="Resemblance mode" error={errors.resemblanceMode?.message}>
          <Select {...register("resemblanceMode")}>
            <option value="strong">Strong resemblance</option>
            <option value="balanced">Balanced inspiration</option>
            <option value="loose">Loose reference</option>
          </Select>
        </Field>
        <Field
          label="Number of style ideas"
          error={errors.numberOfStyleIdeas?.message}
        >
          <Select {...register("numberOfStyleIdeas", { valueAsNumber: true })}>
            <option value={4}>4</option>
            <option value={8}>8</option>
            <option value={12}>12</option>
            <option value={16}>16</option>
          </Select>
        </Field>
      </div>

      <Field label="Occasion types" error={errors.occasionTypes?.message}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {occasions.map((occasion) => {
            const active = selectedOccasions.includes(occasion);
            return (
              <button
                key={occasion}
                type="button"
                className={cn(
                  "focus-ring rounded-md border px-3 py-2 text-left text-sm capitalize transition",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted",
                )}
                onClick={() => toggleOccasion(occasion)}
              >
                {occasion}
              </button>
            );
          })}
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Disliked styles" error={errors.dislikedStyles?.message}>
          <Textarea placeholder="skinny jeans, loud logos, formal suits" {...register("dislikedStyles")} />
        </Field>
        <Field label="Favorite colors" error={errors.favoriteColors?.message}>
          <Textarea placeholder="cream, olive, rust, indigo" {...register("favoriteColors")} />
        </Field>
      </div>

      <label className="flex items-start gap-3 rounded-lg border bg-muted/35 p-4 text-sm">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4"
          {...register("usePhotoReferenceConsent")}
        />
        <span>
          Make it look like me by using my uploaded photo as a loose image-generation reference.
          The app will still avoid identity claims, sensitive guesses, or exact try-on language.
        </span>
      </label>

      <Button type="submit" size="lg" disabled={disabled}>
        <Sparkles className="h-4 w-4" />
        {submitLabel}
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

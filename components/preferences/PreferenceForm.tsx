"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { preferencesSchema, type Preferences } from "@/lib/schemas";

const occasions = [
  "everyday",
  "date night",
  "work casual",
  "event",
  "travel day",
  "daytime walking",
  "dinner",
  "night out",
  "photoshoot",
  "vacation",
  "pool",
  "luxury casual",
];

export const defaultPreferences: Preferences = {
  height: "",
  occasionUseCase: "travel / vacation",
  tripLocation: "Las Vegas",
  tripType: "vacation",
  weatherSeason: "warm / indoor-outdoor",
  styleVibe: "relaxed polished casual",
  genderStyleDirection: "men's adaptable style",
  budgetRange: "mid-range",
  preferredFit: "relaxed",
  dislikedStyles: "",
  favoriteColors: "",
  colorsToAvoid: "",
  comfortModestyNotes: "",
  occasionTypes: ["travel day", "daytime walking", "dinner", "night out"],
  aspectRatio: "1:1",
  numberOfStyleIdeas: 6,
  usePhotoReferenceConsent: false,
  resemblanceMode: "strong",
  outputTypePreference: "reference ideas",
  referenceFeedback: {
    selected: [],
    deselected: [],
    notMyStyle: [],
    generated: [],
    saved: [],
    downloaded: [],
    refreshCount: 0,
  },
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
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Preferences>({
    resolver: zodResolver(preferencesSchema),
    defaultValues,
  });

  const selectedOccasions = useWatch({
    control,
    name: "occasionTypes",
  }) ?? [];

  function toggleOccasion(occasion: string) {
    const next = selectedOccasions.includes(occasion)
      ? selectedOccasions.filter((item) => item !== occasion)
      : [...selectedOccasions, occasion];
    setValue("occasionTypes", next, { shouldDirty: true, shouldValidate: true });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="What are you dressing for?" error={errors.occasionUseCase?.message}>
          <Input placeholder="vacation, date night, event, everyday refresh" {...register("occasionUseCase")} />
        </Field>
        <Field label="Where are you going?" error={errors.tripLocation?.message}>
          <Input placeholder="Las Vegas, NYC, beach trip, home city" {...register("tripLocation")} />
        </Field>
        <Field label="Trip/context type" error={errors.tripType?.message}>
          <Input placeholder="vacation, casual, work trip, party weekend" {...register("tripType")} />
        </Field>
        <Field label="Weather / season" error={errors.weatherSeason?.message}>
          <Input placeholder="summer, cold weather, rainy, indoor/outdoor" {...register("weatherSeason")} />
        </Field>
        <Field label="What style direction do you want?" error={errors.styleVibe?.message}>
          <Input placeholder="minimal, streetwear, luxury casual, colorful" {...register("styleVibe")} />
        </Field>
        <Field label="General style lane" error={errors.genderStyleDirection?.message}>
          <Input placeholder="men's style, womenswear, unisex, androgynous" {...register("genderStyleDirection")} />
        </Field>
        <Field label="Optional height" error={errors.height?.message}>
          <Input placeholder="5'7&quot; or 170 cm" {...register("height")} />
        </Field>
        <Field label="Budget range" error={errors.budgetRange?.message}>
          <Input placeholder="budget, mid-range, luxury" {...register("budgetRange")} />
        </Field>
        <Field label="Preferred fit" error={errors.preferredFit?.message}>
          <Select defaultValue={defaultValues.preferredFit} {...register("preferredFit")}>
            <option value="slim">Slim</option>
            <option value="regular">Regular</option>
            <option value="relaxed">Relaxed</option>
            <option value="oversized">Oversized</option>
          </Select>
        </Field>
        <Field label="Board aspect ratio" error={errors.aspectRatio?.message}>
          <Select {...register("aspectRatio")}>
            <option value="1:1">1:1 square</option>
            <option value="4:5">4:5 portrait</option>
            <option value="16:9">16:9 wide</option>
          </Select>
        </Field>
        <Field label="How close should generated looks resemble your photo?" error={errors.resemblanceMode?.message}>
          <Select {...register("resemblanceMode")}>
            <option value="strong">Strong resemblance</option>
            <option value="balanced">Balanced inspiration</option>
            <option value="loose">Loose reference</option>
          </Select>
        </Field>
        <Field label="Number of looks" error={errors.numberOfStyleIdeas?.message}>
          <Select {...register("numberOfStyleIdeas", { valueAsNumber: true })}>
            <option value={4}>4</option>
            <option value={6}>6</option>
            <option value={8}>8</option>
            <option value={12}>12</option>
            <option value={16}>16</option>
          </Select>
        </Field>
        <Field label="Output type preference" error={errors.outputTypePreference?.message}>
          <Select {...register("outputTypePreference")}>
            <option value="reference ideas">Reference ideas</option>
            <option value="personalized looks">Personalized looks</option>
            <option value="final board">Final board</option>
          </Select>
        </Field>
      </div>

      <Field label="What are the key occasions?" error={errors.occasionTypes?.message}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {occasions.map((occasion) => {
            const active = selectedOccasions.includes(occasion);
            return (
              <button
                key={occasion}
                type="button"
                aria-pressed={active}
                className={cn(
                  "focus-ring w-full rounded-md border px-3 py-2 text-left text-sm capitalize transition",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
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
        <Field label="Any styles you dislike?" error={errors.dislikedStyles?.message}>
          <Textarea placeholder="skinny jeans, loud logos, formal suits" {...register("dislikedStyles")} />
        </Field>
        <Field label="Colors you love" error={errors.favoriteColors?.message}>
          <Textarea placeholder="cream, olive, rust, indigo" {...register("favoriteColors")} />
        </Field>
        <Field label="Colors to avoid" error={errors.colorsToAvoid?.message}>
          <Textarea placeholder="neon, all black, pastels" {...register("colorsToAvoid")} />
        </Field>
        <Field label="Comfort or modesty notes" error={errors.comfortModestyNotes?.message}>
          <Textarea placeholder="breathable fabrics, no shorts, comfortable shoes" {...register("comfortModestyNotes")} />
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

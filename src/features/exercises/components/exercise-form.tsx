"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { NativeSelect } from "@/components/forms/native-select";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/hooks/use-form-action";
import { cn } from "@/lib/utils";

import { saveExercise, type ExerciseFormState } from "../actions";
import { BODY_REGION_LABELS, BODY_REGIONS, CATEGORIES, CATEGORY_LABELS, EQUIPMENT, EQUIPMENT_LABELS } from "../constants";
import type { Exercise, MuscleGroup } from "../types";

const initialState: ExerciseFormState = { status: "idle" };

export function ExerciseForm({
  exercise,
  muscleGroups,
  cancelHref,
}: {
  exercise?: Exercise;
  muscleGroups: MuscleGroup[];
  cancelHref: string;
}) {
  const { state, pending, formProps } = useFormAction(saveExercise.bind(null, exercise?.id ?? null), initialState);
  const [primaryId, setPrimaryId] = useState<number | null>(exercise?.primaryMuscle.id ?? null);
  const [secondaryIds, setSecondaryIds] = useState<Set<number>>(
    () => new Set(exercise?.secondaryMuscles.map((m) => m.id) ?? []),
  );
  const errors = state.fieldErrors ?? {};

  const groupsByRegion = useMemo(
    () =>
      BODY_REGIONS.map((region) => ({
        region,
        groups: muscleGroups.filter((g) => g.bodyRegion === region),
      })).filter((r) => r.groups.length),
    [muscleGroups],
  );

  function toggleSecondary(id: number) {
    setSecondaryIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form {...formProps} className="grid gap-6" noValidate>
      {state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}

      <FormField
        name="name"
        label="Name"
        required
        maxLength={80}
        autoComplete="off"
        placeholder="e.g. Landmine Press"
        defaultValue={exercise?.name}
        error={errors.name}
      />

      <div className="grid gap-2">
        <Label htmlFor="description">
          Description <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="description"
          name="description"
          maxLength={1000}
          rows={3}
          defaultValue={exercise?.description ?? ""}
          placeholder="Setup cues, grip, range of motion…"
          aria-invalid={errors.description ? true : undefined}
          className="min-h-24 rounded-xl px-3.5 py-3"
        />
        {errors.description ? <p className="text-sm text-destructive">{errors.description}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="primaryMuscleGroupId">Main muscle group</Label>
          <NativeSelect
            id="primaryMuscleGroupId"
            name="primaryMuscleGroupId"
            value={primaryId ?? ""}
            onChange={(e) => setPrimaryId(e.target.value ? Number(e.target.value) : null)}
            aria-invalid={errors.primaryMuscleGroupId ? true : undefined}
          >
            <option value="">Choose…</option>
            {groupsByRegion.map(({ region, groups }) => (
              <optgroup key={region} label={BODY_REGION_LABELS[region]}>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
          {errors.primaryMuscleGroupId ? <p className="text-sm text-destructive">{errors.primaryMuscleGroupId}</p> : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="equipment">Equipment</Label>
          <NativeSelect
            id="equipment"
            name="equipment"
            defaultValue={exercise?.equipment ?? ""}
            aria-invalid={errors.equipment ? true : undefined}
          >
            <option value="">Choose…</option>
            {EQUIPMENT.map((eq) => (
              <option key={eq} value={eq}>
                {EQUIPMENT_LABELS[eq]}
              </option>
            ))}
          </NativeSelect>
          {errors.equipment ? <p className="text-sm text-destructive">{errors.equipment}</p> : null}
        </div>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Type</legend>
        <div className="grid grid-cols-2 gap-2 sm:w-80">
          {CATEGORIES.map((c) => (
            <label key={c} className="relative">
              <input
                type="radio"
                name="category"
                value={c}
                defaultChecked={exercise?.category === c}
                className="peer sr-only"
              />
              <span className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-sm font-medium text-muted-foreground transition-colors peer-checked:border-primary peer-checked:bg-accent peer-checked:text-accent-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
                {CATEGORY_LABELS[c]}
              </span>
            </label>
          ))}
        </div>
        {errors.category ? <p className="text-sm text-destructive">{errors.category}</p> : null}
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-medium">
          Secondary muscles <span className="font-normal text-muted-foreground">(optional)</span>
        </legend>
        {groupsByRegion.map(({ region, groups }) => (
          <div key={region} className="grid gap-1.5 sm:grid-cols-[96px_1fr] sm:items-start">
            <p className="pt-2 text-xs text-muted-foreground">{BODY_REGION_LABELS[region]}</p>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => {
                const isPrimary = g.id === primaryId;
                const checked = secondaryIds.has(g.id) && !isPrimary;
                return (
                  <label key={g.id} className={cn("relative", isPrimary && "cursor-not-allowed opacity-40")}>
                    <input
                      type="checkbox"
                      name="secondaryMuscleGroupIds"
                      value={g.id}
                      checked={checked}
                      disabled={isPrimary}
                      onChange={() => toggleSecondary(g.id)}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "inline-flex h-9 items-center rounded-full border border-border px-3.5 text-sm text-muted-foreground transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                        !isPrimary && "cursor-pointer hover:border-primary/40 hover:text-foreground",
                        checked && "border-primary bg-accent text-accent-foreground",
                      )}
                    >
                      {g.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        {errors.secondaryMuscleGroupIds ? <p className="text-sm text-destructive">{errors.secondaryMuscleGroupIds}</p> : null}
      </fieldset>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button asChild variant="ghost" className="h-11 rounded-xl px-5">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <SubmitButton pending={pending} pendingLabel="Saving…" className="sm:w-auto sm:px-6">
          {exercise ? "Save changes" : "Create exercise"}
        </SubmitButton>
      </div>
    </form>
  );
}

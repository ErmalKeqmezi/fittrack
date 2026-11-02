"use client";

import { Check, Search } from "lucide-react";
import { useMemo, useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { BODY_REGION_LABELS, BODY_REGIONS, EQUIPMENT_LABELS, type BodyRegion } from "../constants";
import { defaultFilters, filterExercises } from "../filters";
import type { Exercise } from "../types";

/**
 * Searchable multi-select of exercises. `onConfirm` receives the ids in pick
 * order and returns true when the dialog should close.
 */
export function ExercisePickerDialog({
  title,
  exercises,
  existingIds,
  maxSelectable,
  existingLabel = "already added",
  onConfirm,
  trigger,
}: {
  title: string;
  exercises: Exercise[];
  existingIds: Set<string>;
  maxSelectable: number;
  existingLabel?: string;
  onConfirm: (exerciseIds: string[]) => Promise<boolean>;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<BodyRegion | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const remaining = maxSelectable;

  const results = useMemo(
    () => filterExercises(exercises, { ...defaultFilters, query, region }),
    [exercises, query, region],
  );

  function reset(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setRegion(null);
      setSelected([]);
    }
  }

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : current.length < remaining ? [...current, id] : current,
    );
  }

  function add() {
    startTransition(async () => {
      if (await onConfirm(selected)) reset(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-4 rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Select one or more. They are added in the order you pick them.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises"
            aria-label="Search exercises"
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-input bg-input/30 pr-3 pl-10 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
          />
        </div>
        <div className="-mx-6 flex gap-1.5 overflow-x-auto px-6 pb-1 [scrollbar-width:none]" role="radiogroup" aria-label="Muscle group">
          {[null, ...BODY_REGIONS].map((r) => (
            <button
              key={r ?? "all"}
              type="button"
              role="radio"
              aria-checked={region === r}
              onClick={() => setRegion(r)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors",
                region === r ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {r ? BODY_REGION_LABELS[r] : "All"}
            </button>
          ))}
        </div>

        <ul className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2" aria-label="Exercises">
          {results.length === 0 ? <li className="py-8 text-center text-sm text-muted-foreground">No exercises match.</li> : null}
          {results.map((exercise) => {
            const order = selected.indexOf(exercise.id);
            const isSelected = order !== -1;
            return (
              <li key={exercise.id}>
                <button
                  type="button"
                  onClick={() => toggle(exercise.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-secondary",
                    isSelected && "bg-accent hover:bg-accent",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-md border text-xs font-semibold tabular-nums",
                      isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {isSelected ? order + 1 : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{exercise.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {exercise.primaryMuscle.name} · {EQUIPMENT_LABELS[exercise.equipment]}
                      {existingIds.has(exercise.id) ? ` · ${existingLabel}` : ""}
                    </span>
                  </span>
                  {isSelected ? <Check className="size-4 text-primary" aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            {remaining <= 0 ? "No room for more exercises." : `${selected.length} selected`}
          </p>
          <Button className="h-11 rounded-xl px-5" disabled={!selected.length || pending} onClick={add}>
            {pending ? "Adding…" : `Add ${selected.length || ""} ${selected.length === 1 ? "exercise" : "exercises"}`.replace("  ", " ")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

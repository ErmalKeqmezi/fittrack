"use client";

import { ArrowLeftRight } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SwapExerciseDialog, type SwapRequest } from "@/features/exercises/components/swap-exercise-dialog";
import type { Exercise } from "@/features/exercises/types";
import { offline } from "@/lib/offline";

import { swapPlanExercise } from "../actions";
import type { PlanExercise } from "../types";

/** Replaces one exercise of a plan day, keeping its place and targets. */
export function SwapPlanExercise({ item, dayExerciseIds, library }: { item: PlanExercise; dayExerciseIds: string[]; library: Exercise[] }) {
  const [open, setOpen] = useState(false);
  const request = useMemo<SwapRequest | null>(
    () =>
      open
        ? {
            original: { exerciseId: item.exercise.id, name: item.exercise.name },
            unavailableIds: new Set(dayExerciseIds),
            unavailableLabel: "In this day",
            scope: "plan",
          }
        : null,
    [open, item.exercise.id, item.exercise.name, dayExerciseIds],
  );

  return (
    <>
      <Button variant="ghost" className="mr-2 size-11 shrink-0 rounded-xl text-muted-foreground" aria-label={`Swap ${item.exercise.name}`} onClick={() => setOpen(true)}>
        <ArrowLeftRight aria-hidden />
      </Button>
      <SwapExerciseDialog
        request={request}
        library={library}
        onClose={() => setOpen(false)}
        onConfirm={async (replacement) => {
          const result = await swapPlanExercise(item.id, replacement.id).catch(offline);
          if (result.ok) toast.success(result.message ?? "Exercise swapped.");
          else toast.error(result.message);
          return result.ok;
        }}
      />
    </>
  );
}

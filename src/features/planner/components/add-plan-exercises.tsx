"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";

import { ExercisePickerDialog } from "@/features/exercises/components/exercise-picker-dialog";
import type { Exercise } from "@/features/exercises/types";

import { addPlanExercises } from "../actions";
import { MAX_EXERCISES_PER_DAY } from "../constants";

export function AddPlanExercises({
  dayId,
  dayName,
  library,
  existingIds,
  trigger,
}: {
  dayId: string;
  dayName: string;
  library: Exercise[];
  existingIds: string[];
  trigger: ReactNode;
}) {
  return (
    <ExercisePickerDialog
      title={`Add exercises to ${dayName}`}
      exercises={library}
      existingIds={new Set(existingIds)}
      existingLabel="In this day"
      maxSelectable={MAX_EXERCISES_PER_DAY - existingIds.length}
      trigger={trigger}
      onConfirm={async (ids) => {
        const result = await addPlanExercises(dayId, ids);
        if (result.ok) toast.success(result.message);
        else toast.error(result.message);
        return result.ok;
      }}
    />
  );
}

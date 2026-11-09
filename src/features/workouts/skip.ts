import type { ExerciseMuscles } from "@/features/analytics/calculations";

import { previousVolume } from "./tracker-state";
import type { PreviousPerformance, TrackerExercise } from "./types";

/** What skipping an exercise today costs, so it's a choice made knowingly. */
export type SkipImpact = {
  name: string;
  /** Null when the exercise isn't in the library any more, so its muscles are unknown. */
  muscle: string | null;
  /** Other exercises today with the same main muscle. */
  sameMuscle: string[];
  /** Other exercises today that work it as a secondary muscle. */
  lightly: string[];
  /** This exercise's volume last time, if it has been done before. */
  lastVolumeKg: number | null;
  lastDate: string | null;
  /** Completed sets that would be removed with it. */
  doneSets: number;
};

export function skipImpact(
  exercise: TrackerExercise,
  workout: TrackerExercise[],
  muscles: Map<string, ExerciseMuscles>,
  previous: PreviousPerformance | undefined,
): SkipImpact {
  const own = muscles.get(exercise.exerciseId);
  const others = workout.filter((e) => e.id !== exercise.id && e.exerciseId !== exercise.exerciseId);
  const names = (keep: (m: ExerciseMuscles) => boolean) =>
    [...new Set(others.filter((e) => muscles.get(e.exerciseId) && keep(muscles.get(e.exerciseId)!)).map((e) => e.name))];

  return {
    name: exercise.name,
    muscle: own?.primary.name ?? null,
    sameMuscle: own ? names((m) => m.primary.id === own.primary.id) : [],
    lightly: own ? names((m) => m.primary.id !== own.primary.id && m.secondary.some((s) => s.id === own.primary.id)) : [],
    lastVolumeKg: previousVolume(previous),
    lastDate: previous?.startedAt ?? null,
    doneSets: exercise.sets.filter((s) => s.done).length,
  };
}

import { round2 } from "@/features/analytics/calculations";

import type { PreviousPerformance, TrackerExercise } from "./types";

/**
 * Rule-based training hints computed only from the user's own logged sets.
 * Nothing here is logged automatically: the user applies a hint explicitly.
 */

/** Smallest jump most gyms can load. */
export const WEIGHT_INCREMENT_KG = 2.5;

export type ProgressionHint =
  | { kind: "increase"; weightKg: number; reps: number; reason: string }
  | { kind: "repeat"; weightKg: number; reps: number; reason: string };

/**
 * Double progression: stay at a weight until every target set reaches the top
 * of the rep range, then add weight and return to the bottom of the range.
 * Needs a planned rep range and a previous session; otherwise returns null.
 */
export function progressionHint(targets: TrackerExercise["targets"], previous: PreviousPerformance | undefined): ProgressionHint | null {
  if (!targets || !previous) return null;
  const working = previous.sets.filter((s) => !s.isWarmup);
  if (!working.length) return null;

  const topWeight = Math.max(...working.map((s) => s.weightKg));
  if (topWeight <= 0) return null; // bodyweight: progress by reps, no weight to suggest

  const atTop = working.filter((s) => s.weightKg === topWeight);
  const enoughSets = atTop.length >= targets.sets;
  const allHitTop = atTop.every((s) => s.reps >= targets.repsMax);

  if (enoughSets && allHitTop) {
    return {
      kind: "increase",
      weightKg: round2(topWeight + WEIGHT_INCREMENT_KG),
      reps: targets.repsMin,
      reason: `You hit ${targets.repsMax}+ reps on all ${atTop.length} sets at ${topWeight} kg last time.`,
    };
  }

  const best = Math.max(...atTop.map((s) => s.reps));
  const goal = Math.min(best + 1, targets.repsMax);
  return {
    kind: "repeat",
    weightKg: topWeight,
    reps: Math.max(goal, targets.repsMin),
    reason: enoughSets
      ? `Build to ${targets.repsMax} reps on every set before adding weight.`
      : `Complete all ${targets.sets} sets at ${topWeight} kg before adding weight.`,
  };
}

export type WarmupSet = { weightKg: number; reps: number };

const WARMUP_RAMP = [
  { percent: 0.5, reps: 8 },
  { percent: 0.7, reps: 5 },
  { percent: 0.85, reps: 3 },
];

/** Below this, a full ramp is wasted effort: one light set is enough. */
const SHORT_RAMP_BELOW_KG = 30;

function roundDownToIncrement(weightKg: number) {
  return Math.floor(weightKg / WEIGHT_INCREMENT_KG) * WEIGHT_INCREMENT_KG;
}

/** Warm-up ramp (50%, 70%, 85%) for a working weight, rounded down to loadable weights. */
export function warmupSets(workingWeightKg: number): WarmupSet[] {
  if (!(workingWeightKg > 0)) return [];
  const ramp = workingWeightKg < SHORT_RAMP_BELOW_KG ? WARMUP_RAMP.slice(0, 1) : WARMUP_RAMP;
  const sets: WarmupSet[] = [];
  for (const step of ramp) {
    const weightKg = roundDownToIncrement(workingWeightKg * step.percent);
    if (weightKg > 0 && weightKg < workingWeightKg && !sets.some((s) => s.weightKg === weightKg)) {
      sets.push({ weightKg, reps: step.reps });
    }
  }
  return sets;
}

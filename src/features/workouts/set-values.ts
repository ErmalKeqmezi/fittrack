// Input parsing for logged sets. Ranges mirror exercise_sets CHECK constraints.

export const WEIGHT_MAX = 1000;
export const REPS_MAX = 200;

export function parseWeight(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0 || n > WEIGHT_MAX) return null;
  return Math.round(n * 100) / 100;
}

export function parseReps(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return n <= REPS_MAX ? n : null;
}

/** RPE is optional: "" means none; otherwise 1–10 in steps of 0.5. */
export function parseRpe(value: string): number | null | undefined {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 1 || n > 10 || Math.round(n * 2) !== n * 2) return undefined;
  return n;
}

export type SetValidity = { weight: boolean; reps: boolean; rpe: boolean; complete: boolean };

export function validateSet(set: { weight: string; reps: string; rpe: string }): SetValidity {
  const weight = parseWeight(set.weight) !== null;
  const reps = parseReps(set.reps) !== null;
  const rpe = parseRpe(set.rpe) !== undefined;
  return { weight, reps, rpe, complete: weight && reps && rpe };
}

export function formatWeightInput(n: number) {
  return String(Math.round(n * 100) / 100);
}

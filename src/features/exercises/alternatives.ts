import type { Exercise } from "./types";

/**
 * Suggested replacements for an exercise, from the library's own
 * classifications. Plain rules, no guessing: same main muscle first, then
 * shared secondary muscles, the same kind of movement, and the same category.
 */

/** Movement families read from the exercise name. First match wins, so specific ones come first. */
const PATTERNS: [pattern: string, test: RegExp][] = [
  ["fly", /\b(fly|flye|crossover|pec deck)\b/],
  ["raise", /\b(raise|shrug)\b/],
  ["pulldown", /\b(pulldown|pull up|chin up)\b/],
  ["row", /\b(row|face pull)\b/],
  ["dip", /\bdip\b/],
  ["curl", /\bcurl\b/],
  ["extension", /\b(extension|pushdown|skull crusher|kickback)\b/],
  ["squat", /\b(squat|leg press|lunge|step up)\b/],
  ["hinge", /\b(deadlift|hip thrust|good morning|glute bridge)\b/],
  ["press", /\b(press|push up)\b/],
  ["core", /\b(crunch|plank|rollout|twist|leg raise|sit up)\b/],
  ["carry", /\bcarry\b/],
];

export function movementPattern(name: string): string | null {
  const text = name.toLowerCase().replace(/[^a-z]+/g, " ");
  return PATTERNS.find(([, test]) => test.test(text))?.[0] ?? null;
}

const SAME_PRIMARY = 100;
const RELATED_PRIMARY = 30;
const SAME_PATTERN = 25;
const SAME_CATEGORY = 12;
const SHARED_SECONDARY = 6;
const MAX_SHARED_SECONDARY = 3;

export function alternativeScore(original: Exercise, candidate: Exercise) {
  const secondary = new Set(original.secondaryMuscles.map((m) => m.id));
  const candidateSecondary = new Set(candidate.secondaryMuscles.map((m) => m.id));
  const samePrimary = candidate.primaryMuscle.id === original.primaryMuscle.id;
  // One trains as a helper what the other trains mainly.
  const related = secondary.has(candidate.primaryMuscle.id) || candidateSecondary.has(original.primaryMuscle.id);
  if (!samePrimary && !related) return 0;

  const shared = [...candidateSecondary].filter((id) => secondary.has(id)).length;
  const pattern = movementPattern(original.name);
  return (
    (samePrimary ? SAME_PRIMARY : RELATED_PRIMARY) +
    (pattern !== null && pattern === movementPattern(candidate.name) ? SAME_PATTERN : 0) +
    (candidate.category === original.category ? SAME_CATEGORY : 0) +
    Math.min(shared, MAX_SHARED_SECONDARY) * SHARED_SECONDARY
  );
}

export const MAX_ALTERNATIVES = 6;

/**
 * The best replacements, most similar first. Exercises with the same main
 * muscle always come before ones that only work it as a helper, and those are
 * only used to fill the list when the library has few direct matches.
 */
export function suggestAlternatives(original: Exercise, library: Exercise[], exclude: ReadonlySet<string> = new Set()): Exercise[] {
  return library
    .filter((e) => e.id !== original.id && !e.isArchived && !exclude.has(e.id))
    .map((exercise) => ({ exercise, score: alternativeScore(original, exercise) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name))
    .slice(0, MAX_ALTERNATIVES)
    .map((entry) => entry.exercise);
}

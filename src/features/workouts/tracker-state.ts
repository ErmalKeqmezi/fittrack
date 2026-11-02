import { formatWeightInput, parseReps, parseRpe, parseWeight, validateSet } from "./set-values";
import type { PreviousPerformance, SessionSnapshot, TrackerExercise, TrackerSet, TrackerState } from "./types";

export const DEFAULT_REST_SECONDS = 90;
export const MAX_SESSION_EXERCISES = 30;
export const MAX_SETS_PER_EXERCISE = 50;

export type NewExercise = {
  id: string;
  exerciseId: string;
  name: string;
  restSeconds?: number | null;
  targets?: TrackerExercise["targets"];
  /** Pre-generated UUIDs for the initial empty rows (one per target set, else one). */
  setIds: string[];
};

export type TrackerAction =
  | { type: "rename"; name: string }
  | { type: "setNotes"; notes: string }
  | { type: "setTimes"; startedAt: string; endedAt: string | null }
  | { type: "addExercises"; exercises: NewExercise[] }
  | { type: "removeExercise"; exerciseId: string }
  | { type: "moveExercise"; exerciseId: string; offset: -1 | 1 }
  | { type: "setExerciseNotes"; exerciseId: string; notes: string }
  | { type: "toggleExerciseNotes"; exerciseId: string }
  | { type: "toggleRpe"; exerciseId: string }
  | { type: "addSet"; exerciseId: string; setId: string }
  | { type: "removeSet"; exerciseId: string; setId: string }
  | { type: "updateSet"; exerciseId: string; setId: string; field: "weight" | "reps" | "rpe"; value: string }
  | { type: "toggleWarmup"; exerciseId: string; setId: string }
  | { type: "toggleDone"; exerciseId: string; setId: string; suggestion?: { weight: number; reps: number } | null; now: number }
  | { type: "adjustRest"; seconds: number; now: number }
  | { type: "stopRest" }
  | { type: "replace"; state: TrackerState };

function emptySet(id: string): TrackerSet {
  return { id, weight: "", reps: "", rpe: "", isWarmup: false, done: false };
}

function mapExercise(state: TrackerState, exerciseId: string, fn: (e: TrackerExercise) => TrackerExercise): TrackerState {
  return { ...state, exercises: state.exercises.map((e) => (e.id === exerciseId ? fn(e) : e)) };
}

function mapSet(exercise: TrackerExercise, setId: string, fn: (s: TrackerSet) => TrackerSet): TrackerExercise {
  return { ...exercise, sets: exercise.sets.map((s) => (s.id === setId ? fn(s) : s)) };
}

/** Number of empty rows a newly added exercise starts with. */
export function initialSetCount(targets: TrackerExercise["targets"]) {
  return Math.min(targets?.sets ?? 1, MAX_SETS_PER_EXERCISE);
}

/** Builds a tracker exercise with its initial empty rows. */
export function createTrackerExercise(input: NewExercise): TrackerExercise {
  return {
    id: input.id,
    exerciseId: input.exerciseId,
    name: input.name,
    notes: "",
    showNotes: false,
    showRpe: false,
    restSeconds: input.restSeconds ?? DEFAULT_REST_SECONDS,
    targets: input.targets ?? null,
    sets: input.setIds.slice(0, MAX_SETS_PER_EXERCISE).map(emptySet),
  };
}

export function trackerReducer(state: TrackerState, action: TrackerAction): TrackerState {
  switch (action.type) {
    case "replace":
      return action.state;
    case "rename":
      return { ...state, name: action.name.slice(0, 80) };
    case "setNotes":
      return { ...state, notes: action.notes.slice(0, 2000) };
    case "setTimes":
      return { ...state, startedAt: action.startedAt, endedAt: action.endedAt };
    case "addExercises": {
      const room = MAX_SESSION_EXERCISES - state.exercises.length;
      const added = action.exercises.slice(0, Math.max(room, 0)).map(createTrackerExercise);
      return { ...state, exercises: [...state.exercises, ...added] };
    }
    case "removeExercise":
      return { ...state, exercises: state.exercises.filter((e) => e.id !== action.exerciseId) };
    case "moveExercise": {
      const index = state.exercises.findIndex((e) => e.id === action.exerciseId);
      const target = index + action.offset;
      if (index < 0 || target < 0 || target >= state.exercises.length) return state;
      const exercises = [...state.exercises];
      [exercises[index], exercises[target]] = [exercises[target], exercises[index]];
      return { ...state, exercises };
    }
    case "setExerciseNotes":
      return mapExercise(state, action.exerciseId, (e) => ({ ...e, notes: action.notes.slice(0, 1000) }));
    case "toggleExerciseNotes":
      return mapExercise(state, action.exerciseId, (e) => ({ ...e, showNotes: !e.showNotes }));
    case "toggleRpe":
      return mapExercise(state, action.exerciseId, (e) => ({ ...e, showRpe: !e.showRpe }));
    case "addSet":
      return mapExercise(state, action.exerciseId, (e) => {
        if (e.sets.length >= MAX_SETS_PER_EXERCISE) return e;
        // A new row starts with the values of the row above as a convenience;
        // it only counts once the user marks it done.
        const last = e.sets.at(-1);
        const next = emptySet(action.setId);
        if (last && validateSet(last).complete) {
          next.weight = last.weight;
          next.reps = last.reps;
        }
        return { ...e, sets: [...e.sets, next] };
      });
    case "removeSet":
      return mapExercise(state, action.exerciseId, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== action.setId) }));
    case "updateSet":
      return mapExercise(state, action.exerciseId, (e) =>
        mapSet(e, action.setId, (s) => {
          const next = { ...s, [action.field]: action.value };
          // Editing a completed set to an invalid value un-completes it.
          return next.done && !validateSet(next).complete ? { ...next, done: false } : next;
        }),
      );
    case "toggleWarmup":
      return mapExercise(state, action.exerciseId, (e) => mapSet(e, action.setId, (s) => ({ ...s, isWarmup: !s.isWarmup })));
    case "toggleDone": {
      const exercise = state.exercises.find((e) => e.id === action.exerciseId);
      const set = exercise?.sets.find((s) => s.id === action.setId);
      if (!exercise || !set) return state;

      if (set.done) {
        return mapExercise(state, exercise.id, (e) => mapSet(e, set.id, (s) => ({ ...s, done: false })));
      }

      // Empty fields take the suggested value shown as a placeholder.
      const filled = {
        ...set,
        weight: set.weight.trim() === "" && action.suggestion ? formatWeightInput(action.suggestion.weight) : set.weight,
        reps: set.reps.trim() === "" && action.suggestion ? String(action.suggestion.reps) : set.reps,
      };
      if (!validateSet(filled).complete) return state;

      const next = mapExercise(state, exercise.id, (e) => mapSet(e, set.id, () => ({ ...filled, done: true })));
      if (state.status !== "in_progress" || set.isWarmup) return next;
      return {
        ...next,
        restTimer: { endsAt: action.now + exercise.restSeconds * 1000, totalSeconds: exercise.restSeconds, label: exercise.name },
      };
    }
    case "adjustRest": {
      if (!state.restTimer) return state;
      const endsAt = state.restTimer.endsAt + action.seconds * 1000;
      if (endsAt <= action.now) return { ...state, restTimer: null };
      return { ...state, restTimer: { ...state.restTimer, endsAt, totalSeconds: Math.max(state.restTimer.totalSeconds + action.seconds, 1) } };
    }
    case "stopRest":
      return { ...state, restTimer: null };
  }
}

/** Server snapshot: rows with valid numbers only; empty rows stay on the device. */
export function toSnapshot(state: TrackerState): SessionSnapshot {
  return {
    sessionId: state.sessionId,
    name: state.name.trim() || "Workout",
    notes: state.notes,
    ...(state.status === "completed" ? { startedAt: state.startedAt, endedAt: state.endedAt ?? undefined } : {}),
    exercises: state.exercises.map((e) => ({
      id: e.id,
      exercise_id: e.exerciseId,
      notes: e.notes,
      sets: e.sets
        .filter((s) => validateSet(s).complete)
        .map((s) => ({
          id: s.id,
          weight_kg: parseWeight(s.weight)!,
          reps: parseReps(s.reps)!,
          rpe: parseRpe(s.rpe) ?? null,
          is_warmup: s.isWarmup,
          is_completed: s.done,
        })),
    })),
  };
}

/**
 * Last time's set that corresponds to a row: the nth warm-up matches the nth
 * warm-up, the nth working set the nth working set.
 */
export function matchingPreviousSet(sets: { isWarmup: boolean }[], setIndex: number, previous: PreviousPerformance | undefined) {
  const row = sets[setIndex];
  if (!previous || !row) return undefined;
  const nth = sets.slice(0, setIndex).filter((s) => s.isWarmup === row.isWarmup).length;
  return previous.sets.filter((s) => s.isWarmup === row.isWarmup)[nth];
}

/** The value hinted in an empty set row: last time's matching set, else the row above. */
export function suggestionFor(exercise: TrackerExercise, setIndex: number, previous: PreviousPerformance | undefined) {
  const prev = matchingPreviousSet(exercise.sets, setIndex, previous);
  if (prev) return { weight: prev.weightKg, reps: prev.reps };
  for (let i = setIndex - 1; i >= 0; i--) {
    const s = exercise.sets[i];
    const weight = parseWeight(s.weight);
    const reps = parseReps(s.reps);
    if (weight !== null && reps !== null) return { weight, reps };
  }
  return null;
}

export type ExerciseProgress = { doneSets: number; totalSets: number; volumeKg: number };

/** Completed working-set totals (warm-ups excluded, like the dashboard). */
export function exerciseProgress(exercise: TrackerExercise): ExerciseProgress {
  let volumeKg = 0;
  let doneSets = 0;
  for (const s of exercise.sets) {
    if (!s.done || s.isWarmup) continue;
    doneSets += 1;
    volumeKg += (parseWeight(s.weight) ?? 0) * (parseReps(s.reps) ?? 0);
  }
  return { doneSets, totalSets: exercise.sets.filter((s) => !s.isWarmup).length, volumeKg: Math.round(volumeKg * 100) / 100 };
}

export function previousVolume(previous: PreviousPerformance | undefined) {
  if (!previous) return null;
  return Math.round(previous.sets.filter((s) => !s.isWarmup).reduce((sum, s) => sum + s.weightKg * s.reps, 0) * 100) / 100;
}

/** Counts rows that would be discarded when finishing (not marked done). */
export function unfinishedSetCount(state: TrackerState) {
  return state.exercises.reduce((sum, e) => sum + e.sets.filter((s) => !s.done).length, 0);
}

import { describe, expect, it } from "vitest";

import { parseReps, parseRpe, parseWeight } from "./set-values";
import { exerciseProgress, matchingPreviousSet, suggestionFor, toSnapshot, trackerReducer, unfinishedSetCount } from "./tracker-state";
import type { TrackerState } from "./types";

const base: TrackerState = {
  sessionId: "s1",
  status: "in_progress",
  name: "Push",
  notes: "",
  startedAt: "2026-11-02T10:00:00Z",
  endedAt: null,
  exercises: [],
  restTimer: null,
};

function withBench(): TrackerState {
  return trackerReducer(base, {
    type: "addExercises",
    exercises: [
      {
        id: "e1",
        exerciseId: "bench",
        name: "Bench Press",
        restSeconds: 120,
        targets: { sets: 3, repsMin: 8, repsMax: 10 },
        setIds: ["a", "b", "c"],
      },
    ],
  });
}

describe("set value parsing", () => {
  it("accepts decimal commas and rejects out-of-range values", () => {
    expect(parseWeight("72,5")).toBe(72.5);
    expect(parseWeight("0")).toBe(0);
    expect(parseWeight("1001")).toBeNull();
    expect(parseWeight("abc")).toBeNull();
    expect(parseReps("8")).toBe(8);
    expect(parseReps("8.5")).toBeNull();
    expect(parseRpe("")).toBeNull();
    expect(parseRpe("8.5")).toBe(8.5);
    expect(parseRpe("8.3")).toBeUndefined();
  });
});

describe("trackerReducer", () => {
  it("creates one empty row per target set", () => {
    const state = withBench();
    expect(state.exercises[0].sets.map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(state.exercises[0].restSeconds).toBe(120);
  });

  it("marks a set done using the suggestion for empty fields and starts the rest timer", () => {
    let state = withBench();
    state = trackerReducer(state, { type: "updateSet", exerciseId: "e1", setId: "a", field: "weight", value: "72.5" });
    state = trackerReducer(state, { type: "toggleDone", exerciseId: "e1", setId: "a", suggestion: { weight: 70, reps: 10 }, now: 1000 });
    const set = state.exercises[0].sets[0];
    expect(set).toMatchObject({ weight: "72.5", reps: "10", done: true });
    expect(state.restTimer).toEqual({ endsAt: 121_000, totalSeconds: 120, label: "Bench Press" });
  });

  it("refuses to complete a set without valid values", () => {
    const state = trackerReducer(withBench(), { type: "toggleDone", exerciseId: "e1", setId: "a", suggestion: null, now: 0 });
    expect(state.exercises[0].sets[0].done).toBe(false);
  });

  it("un-completes a set when it is edited to an invalid value", () => {
    let state = trackerReducer(withBench(), { type: "toggleDone", exerciseId: "e1", setId: "a", suggestion: { weight: 70, reps: 10 }, now: 0 });
    state = trackerReducer(state, { type: "updateSet", exerciseId: "e1", setId: "a", field: "reps", value: "" });
    expect(state.exercises[0].sets[0].done).toBe(false);
  });

  it("does not start rest after warm-ups or while editing history", () => {
    let state = trackerReducer(withBench(), { type: "toggleWarmup", exerciseId: "e1", setId: "a" });
    state = trackerReducer(state, { type: "toggleDone", exerciseId: "e1", setId: "a", suggestion: { weight: 40, reps: 10 }, now: 0 });
    expect(state.restTimer).toBeNull();
    const editing = trackerReducer({ ...withBench(), status: "completed" }, { type: "toggleDone", exerciseId: "e1", setId: "a", suggestion: { weight: 70, reps: 10 }, now: 0 });
    expect(editing.restTimer).toBeNull();
  });

  it("copies the row above into a new set and moves exercises", () => {
    let state = trackerReducer(withBench(), { type: "toggleDone", exerciseId: "e1", setId: "c", suggestion: { weight: 70, reps: 8 }, now: 0 });
    state = trackerReducer(state, { type: "addSet", exerciseId: "e1", setId: "d" });
    expect(state.exercises[0].sets[3]).toMatchObject({ id: "d", weight: "70", reps: "8", done: false });
    state = trackerReducer(state, {
      type: "addExercises",
      exercises: [{ id: "e2", exerciseId: "fly", name: "Fly", setIds: ["x"] }],
    });
    state = trackerReducer(state, { type: "moveExercise", exerciseId: "e2", offset: -1 });
    expect(state.exercises.map((e) => e.id)).toEqual(["e2", "e1"]);
    expect(trackerReducer(state, { type: "moveExercise", exerciseId: "e2", offset: -1 })).toBe(state);
  });

  it("adjusts and clears the rest timer", () => {
    let state = trackerReducer(withBench(), { type: "toggleDone", exerciseId: "e1", setId: "a", suggestion: { weight: 70, reps: 10 }, now: 0 });
    state = trackerReducer(state, { type: "adjustRest", seconds: 15, now: 0 });
    expect(state.restTimer?.endsAt).toBe(135_000);
    state = trackerReducer(state, { type: "adjustRest", seconds: -500, now: 0 });
    expect(state.restTimer).toBeNull();
  });
});

describe("snapshots and progress", () => {
  it("saves only valid rows and keeps the done flag", () => {
    let state = withBench();
    state = trackerReducer(state, { type: "toggleDone", exerciseId: "e1", setId: "a", suggestion: { weight: 70, reps: 10 }, now: 0 });
    state = trackerReducer(state, { type: "updateSet", exerciseId: "e1", setId: "b", field: "weight", value: "70" });
    state = trackerReducer(state, { type: "updateSet", exerciseId: "e1", setId: "b", field: "reps", value: "9" });
    const snapshot = toSnapshot(state);
    expect(snapshot.exercises[0].sets).toEqual([
      { id: "a", weight_kg: 70, reps: 10, rpe: null, is_warmup: false, is_completed: true },
      { id: "b", weight_kg: 70, reps: 9, rpe: null, is_warmup: false, is_completed: false },
    ]);
    expect(snapshot.startedAt).toBeUndefined();
    expect(unfinishedSetCount(state)).toBe(2);
  });

  it("computes progress from completed working sets only", () => {
    let state = withBench();
    state = trackerReducer(state, { type: "toggleWarmup", exerciseId: "e1", setId: "a" });
    state = trackerReducer(state, { type: "toggleDone", exerciseId: "e1", setId: "a", suggestion: { weight: 40, reps: 10 }, now: 0 });
    state = trackerReducer(state, { type: "toggleDone", exerciseId: "e1", setId: "b", suggestion: { weight: 70, reps: 10 }, now: 0 });
    expect(exerciseProgress(state.exercises[0])).toEqual({ doneSets: 1, totalSets: 2, volumeKg: 700 });
  });

  it("suggests last time's matching set, else the row above", () => {
    let state = withBench();
    const previous = { sessionId: "p", startedAt: "", sets: [{ setNumber: 1, weightKg: 70, reps: 10, rpe: null, isWarmup: false }] };
    expect(suggestionFor(state.exercises[0], 0, previous)).toEqual({ weight: 70, reps: 10 });
    expect(suggestionFor(state.exercises[0], 1, previous)).toBeNull();
    state = trackerReducer(state, { type: "toggleDone", exerciseId: "e1", setId: "a", suggestion: { weight: 72.5, reps: 8 }, now: 0 });
    expect(suggestionFor(state.exercises[0], 1, previous)).toEqual({ weight: 72.5, reps: 8 });
  });
});

describe("matchingPreviousSet", () => {
  it("matches warm-ups with warm-ups and working sets with working sets", () => {
    const previous = {
      sessionId: "p",
      startedAt: "",
      sets: [
        { setNumber: 1, weightKg: 40, reps: 10, rpe: null, isWarmup: true },
        { setNumber: 2, weightKg: 70, reps: 10, rpe: null, isWarmup: false },
        { setNumber: 3, weightKg: 70, reps: 8, rpe: null, isWarmup: false },
      ],
    };
    const rows = [{ isWarmup: false }, { isWarmup: true }, { isWarmup: false }];
    expect(matchingPreviousSet(rows, 0, previous)?.weightKg).toBe(70);
    expect(matchingPreviousSet(rows, 1, previous)?.weightKg).toBe(40);
    expect(matchingPreviousSet(rows, 2, previous)?.reps).toBe(8);
    expect(matchingPreviousSet([{ isWarmup: true }, { isWarmup: true }], 1, previous)).toBeUndefined();
  });
});


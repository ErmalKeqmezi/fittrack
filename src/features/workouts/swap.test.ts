import { describe, expect, it } from "vitest";

import { restoreSwapTargets } from "./drafts";
import { swapPlan, trackerReducer } from "./tracker-state";
import type { TrackerExercise, TrackerState } from "./types";

const targets = { sets: 3, repsMin: 8, repsMax: 10 };

function exercise(id: string, exerciseId: string, done: number, over: Partial<TrackerExercise> = {}): TrackerExercise {
  return {
    id,
    exerciseId,
    name: exerciseId,
    notes: "slow negatives",
    showNotes: true,
    showRpe: false,
    restSeconds: 120,
    targets,
    sets: Array.from({ length: 3 }, (_, i) => ({ id: `${id}-${i}`, weight: i < done ? "60" : "62.5", reps: i < done ? "8" : "", rpe: "", isWarmup: false, done: i < done })),
    ...over,
  };
}

const state = (exercises: TrackerExercise[]) => ({ sessionId: "s", status: "in_progress", exercises }) as TrackerState;
const replacement = { id: "new-row", exerciseId: "machine-press", name: "Machine Press", setIds: ["n1", "n2", "n3"] };

describe("swapExercise", () => {
  it("replaces an untouched exercise in place, keeping its programming but not its weights", () => {
    const before = state([exercise("a", "squat", 0), exercise("b", "bench", 0), exercise("c", "curl", 0)]);
    const after = trackerReducer(before, { type: "swapExercise", rowId: "b", replacement });

    expect(after.exercises.map((e) => e.exerciseId)).toEqual(["squat", "machine-press", "curl"]);
    const swapped = after.exercises[1];
    expect(swapped).toMatchObject({ id: "new-row", name: "Machine Press", targets, restSeconds: 120, notes: "slow negatives" });
    expect(swapped.sets).toEqual(["n1", "n2", "n3"].map((id) => ({ id, weight: "", reps: "", rpe: "", isWarmup: false, done: false })));
  });

  it("never moves completed sets: the original keeps them and the replacement is added for the rest", () => {
    const before = state([exercise("a", "squat", 0), exercise("b", "bench", 2), exercise("c", "curl", 0)]);
    expect(swapPlan(before.exercises[1])).toEqual({ mode: "add", completedSets: 2, setCount: 1 });
    const after = trackerReducer(before, { type: "swapExercise", rowId: "b", replacement });

    expect(after.exercises.map((e) => e.exerciseId)).toEqual(["squat", "bench", "machine-press", "curl"]);
    expect(after.exercises[1].id).toBe("b");
    expect(after.exercises[1].sets.map((s) => [s.id, s.weight, s.done])).toEqual([["b-0", "60", true], ["b-1", "60", true]]);
    expect(after.exercises[2]).toMatchObject({ id: "new-row", targets: { ...targets, sets: 1 }, restSeconds: 120, notes: "" });
    expect(after.exercises[2].sets.map((s) => s.done)).toEqual([false]);
  });

  it("leaves at least one set for the replacement when the target is already met", () => {
    expect(swapPlan(exercise("b", "bench", 3))).toEqual({ mode: "add", completedSets: 3, setCount: 1 });
  });

  it("counts a completed warm-up as work that must be kept", () => {
    const warmedUp = exercise("b", "bench", 0);
    warmedUp.sets[0] = { ...warmedUp.sets[0], isWarmup: true, done: true };
    expect(swapPlan(warmedUp)).toMatchObject({ mode: "add", completedSets: 1 });
  });

  it("uses the logged rows when there are no targets", () => {
    expect(swapPlan(exercise("b", "bench", 0, { targets: null }))).toEqual({ mode: "replace", completedSets: 0, setCount: 3 });
  });
});

describe("restoreSwapTargets", () => {
  it("gives a swapped-in exercise back its targets and unfilled rows after a reload", () => {
    const drafted = exercise("new-row", "machine-press", 1);
    // The server only has the completed set, and no targets because the plan has another exercise.
    const saved = { ...drafted, targets: null, restSeconds: 90, sets: drafted.sets.slice(0, 1) };
    const restored = restoreSwapTargets(state([saved]), state([drafted])).exercises[0];
    expect(restored).toMatchObject({ targets, restSeconds: 120 });
    expect(restored.sets.map((s) => s.id)).toEqual(["new-row-0", "new-row-1", "new-row-2"]);
  });

  it("leaves planned exercises and unknown rows alone", () => {
    const planned = exercise("a", "squat", 0);
    const untracked = exercise("x", "curl", 0, { targets: null });
    const server = state([planned, untracked]);
    expect(restoreSwapTargets(server, state([exercise("a", "squat", 0, { targets: { sets: 9, repsMin: 1, repsMax: 1 } })])).exercises).toEqual(server.exercises);
  });
});

import { describe, expect, it } from "vitest";

import { progressionHint, warmupSets } from "./coaching";
import { trackerReducer } from "./tracker-state";
import type { PreviousPerformance, TrackerState } from "./types";

const targets = { sets: 3, repsMin: 8, repsMax: 12 };

function previous(...sets: [number, number, boolean?][]): PreviousPerformance {
  return {
    sessionId: "p",
    startedAt: "2026-11-01T10:00:00Z",
    sets: sets.map(([weightKg, reps, isWarmup], i) => ({ setNumber: i + 1, weightKg, reps, rpe: null, isWarmup: Boolean(isWarmup) })),
  };
}

describe("progressionHint", () => {
  it("adds weight once every target set reaches the top of the range", () => {
    expect(progressionHint(targets, previous([70, 12], [70, 12], [70, 13]))).toMatchObject({ kind: "increase", weightKg: 72.5, reps: 8 });
  });

  it("stays at the weight and adds a rep when a set falls short", () => {
    expect(progressionHint(targets, previous([70, 12], [70, 10], [70, 9]))).toMatchObject({ kind: "repeat", weightKg: 70, reps: 12 });
    expect(progressionHint(targets, previous([70, 9], [70, 9], [70, 8]))).toMatchObject({ kind: "repeat", weightKg: 70, reps: 10 });
  });

  it("does not add weight when fewer sets than planned were done", () => {
    expect(progressionHint(targets, previous([70, 12], [70, 12]))).toMatchObject({ kind: "repeat", weightKg: 70 });
  });

  it("judges only the top weight and ignores warm-ups", () => {
    expect(progressionHint(targets, previous([100, 20, true], [50, 12], [70, 12], [70, 12], [70, 12]))).toMatchObject({ kind: "increase", weightKg: 72.5 });
  });

  it("gives no hint without a plan, history or a weight", () => {
    expect(progressionHint(null, previous([70, 12]))).toBeNull();
    expect(progressionHint(targets, undefined)).toBeNull();
    expect(progressionHint(targets, previous([0, 15], [0, 15], [0, 15]))).toBeNull();
    expect(progressionHint(targets, previous([40, 10, true]))).toBeNull();
  });
});

describe("warmupSets", () => {
  it("ramps to 50, 70 and 85 percent, rounded down to 2.5 kg", () => {
    expect(warmupSets(100)).toEqual([
      { weightKg: 50, reps: 8 },
      { weightKg: 70, reps: 5 },
      { weightKg: 85, reps: 3 },
    ]);
    expect(warmupSets(72.5)).toEqual([
      { weightKg: 35, reps: 8 },
      { weightKg: 50, reps: 5 },
      { weightKg: 60, reps: 3 },
    ]);
  });

  it("uses one set for light weights and none without a weight", () => {
    expect(warmupSets(20)).toEqual([{ weightKg: 10, reps: 8 }]);
    expect(warmupSets(2.5)).toEqual([]);
    expect(warmupSets(0)).toEqual([]);
  });
});

describe("tracker actions for hints", () => {
  const base: TrackerState = {
    sessionId: "s",
    status: "in_progress",
    name: "W",
    notes: "",
    startedAt: "2026-11-02T10:00:00Z",
    endedAt: null,
    restTimer: null,
    exercises: [
      {
        id: "e",
        exerciseId: "x",
        name: "Bench",
        notes: "",
        showNotes: false,
        showRpe: false,
        restSeconds: 90,
        targets,
        sets: [
          { id: "done", weight: "70", reps: "12", rpe: "", isWarmup: false, done: true },
          { id: "empty", weight: "", reps: "", rpe: "", isWarmup: false, done: false },
          { id: "typed", weight: "65", reps: "", rpe: "", isWarmup: false, done: false },
          { id: "warm", weight: "", reps: "", rpe: "", isWarmup: true, done: false },
        ],
      },
    ],
  };

  it("applies a hint to open working rows only, leaving finished and warm-up rows", () => {
    const sets = trackerReducer(base, { type: "applyHint", exerciseId: "e", weightKg: 72.5, reps: 8 }).exercises[0].sets;
    expect(sets.find((s) => s.id === "done")).toMatchObject({ weight: "70", reps: "12" });
    expect(sets.find((s) => s.id === "empty")).toMatchObject({ weight: "72.5", reps: "8", done: false });
    expect(sets.find((s) => s.id === "typed")).toMatchObject({ weight: "72.5", reps: "8" });
    expect(sets.find((s) => s.id === "warm")).toMatchObject({ weight: "", reps: "" });
  });

  it("puts warm-ups first, not completed", () => {
    const sets = trackerReducer(base, {
      type: "addWarmups",
      exerciseId: "e",
      sets: [{ id: "w1", weightKg: 40, reps: 8 }],
    }).exercises[0].sets;
    expect(sets[0]).toEqual({ id: "w1", weight: "40", reps: "8", rpe: "", isWarmup: true, done: false });
    expect(sets).toHaveLength(5);
  });
});

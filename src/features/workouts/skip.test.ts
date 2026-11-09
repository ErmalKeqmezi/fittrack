import { describe, expect, it } from "vitest";

import type { ExerciseMuscles } from "@/features/analytics/calculations";

import { skipImpact } from "./skip";
import { trackerReducer } from "./tracker-state";
import type { TrackerExercise, TrackerState } from "./types";

const exercise = (id: string, exerciseId: string, name: string, done = 0): TrackerExercise => ({
  id,
  exerciseId,
  name,
  notes: "",
  showNotes: false,
  showRpe: false,
  restSeconds: 90,
  targets: null,
  sets: Array.from({ length: 3 }, (_, i) => ({ id: `${id}-${i}`, weight: "50", reps: "8", rpe: "", isWarmup: false, done: i < done })),
});

const chest = { id: 1, name: "Chest" };
const triceps = { id: 2, name: "Triceps" };
const shoulders = { id: 3, name: "Front Delts" };
const muscles = new Map<string, ExerciseMuscles>([
  ["bench", { primary: chest, secondary: [triceps, shoulders] }],
  ["fly", { primary: chest, secondary: [] }],
  ["ohp", { primary: shoulders, secondary: [triceps, chest] }],
  ["curl", { primary: { id: 4, name: "Biceps" }, secondary: [] }],
]);

const bench = exercise("a", "bench", "Bench Press", 1);
const workout = [bench, exercise("b", "fly", "Cable Fly"), exercise("c", "ohp", "Overhead Press"), exercise("d", "curl", "Curl")];

describe("skipImpact", () => {
  it("names what still trains the muscle today and what is lost", () => {
    const previous = { sessionId: "p", startedAt: "2026-11-02T10:00:00Z", sets: [{ setNumber: 1, weightKg: 82.5, reps: 10, rpe: null, isWarmup: false }, { setNumber: 2, weightKg: 40, reps: 10, rpe: null, isWarmup: true }] };
    expect(skipImpact(bench, workout, muscles, previous)).toEqual({
      name: "Bench Press",
      muscle: "Chest",
      sameMuscle: ["Cable Fly"],
      lightly: ["Overhead Press"],
      lastVolumeKg: 825,
      lastDate: "2026-11-02T10:00:00Z",
      doneSets: 1,
    });
  });

  it("reports when nothing else covers the muscle and there is no history", () => {
    expect(skipImpact(workout[3], workout, muscles, undefined)).toMatchObject({ muscle: "Biceps", sameMuscle: [], lightly: [], lastVolumeKg: null, doneSets: 0 });
  });

  it("says nothing about muscles it can't look up", () => {
    expect(skipImpact(exercise("x", "archived", "Old Lift"), workout, muscles, undefined)).toMatchObject({ muscle: null, sameMuscle: [], lightly: [] });
  });
});

describe("restoreExercise (Undo)", () => {
  const state = { exercises: workout } as TrackerState;

  it("puts a skipped exercise back where it was, with its sets", () => {
    const skipped = trackerReducer(state, { type: "removeExercise", exerciseId: "a" });
    const restored = trackerReducer(skipped, { type: "restoreExercise", exercise: bench, index: 0 });
    expect(restored.exercises.map((e) => e.id)).toEqual(["a", "b", "c", "d"]);
    expect(restored.exercises[0].sets.filter((s) => s.done)).toHaveLength(1);
  });

  it("never adds it twice", () => {
    expect(trackerReducer(state, { type: "restoreExercise", exercise: bench, index: 2 }).exercises).toHaveLength(4);
  });
});

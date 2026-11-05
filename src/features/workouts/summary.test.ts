import { describe, expect, it } from "vitest";

import type { ExerciseMuscles } from "@/features/analytics/calculations";

import { buildWorkoutSummary, equivalentSessions, findRecords, muscleBreakdown, type PriorSession } from "./summary";
import type { TrackerExercise, TrackerState } from "./types";

type RawSet = [weight: number, reps: number, opts?: { warmup?: boolean; undone?: boolean }];

let nextId = 0;
function exercise(exerciseId: string, name: string, sets: RawSet[]): TrackerExercise {
  return {
    id: `row-${++nextId}`,
    exerciseId,
    name,
    notes: "",
    showNotes: false,
    showRpe: false,
    restSeconds: 90,
    targets: null,
    sets: sets.map(([w, r, o]) => ({
      id: `set-${++nextId}`,
      weight: String(w),
      reps: String(r),
      rpe: "",
      isWarmup: Boolean(o?.warmup),
      done: !o?.undone,
    })),
  };
}

function workout(exercises: TrackerExercise[], over: Partial<TrackerState> = {}): TrackerState {
  return {
    sessionId: "now",
    status: "completed",
    name: "Push",
    notes: "",
    startedAt: "2026-11-05T10:00:00Z",
    endedAt: "2026-11-05T11:05:00Z",
    restTimer: null,
    exercises,
    ...over,
  };
}

const base = { previous: {}, priorBests: [], equivalentPrior: [], equivalent: null, muscles: new Map() };

describe("stats", () => {
  it("counts completed working sets only", () => {
    const { stats, exercises } = buildWorkoutSummary({
      ...base,
      state: workout([
        exercise("bench", "Bench", [[40, 10, { warmup: true }], [70, 10], [70, 8], [90, 5, { undone: true }]]),
        exercise("fly", "Fly", [[15, 12]]),
        exercise("skip", "Skipped", []),
      ]),
    });
    expect(stats).toEqual({ durationMinutes: 65, volumeKg: 1440, exerciseCount: 2, setCount: 3, repCount: 30, recordCount: 0 });
    expect(exercises[0]).toMatchObject({ setCount: 2, volumeKg: 1260, best: { weightKg: 70, reps: 10 } });
    expect(exercises[0].sets.map((s) => s.label)).toEqual(["W", "1", "2"]);
  });

  it("has honest zeros for a workout without sets and an unknown duration", () => {
    const { stats, highlights } = buildWorkoutSummary({ ...base, state: workout([exercise("a", "A", [])], { endedAt: null }) });
    expect(stats).toEqual({ durationMinutes: null, volumeKg: 0, exerciseCount: 0, setCount: 0, repCount: 0, recordCount: 0 });
    expect(highlights).toEqual([]);
  });

  it("treats a bodyweight exercise's best set by reps", () => {
    const { exercises } = buildWorkoutSummary({ ...base, state: workout([exercise("dip", "Dip", [[0, 10], [0, 14], [0, 9]])]) });
    expect(exercises[0].best).toEqual({ weightKg: 0, reps: 14 });
    expect(exercises[0].bestE1rmKg).toBeNull();
  });
});

describe("records", () => {
  const state = workout([exercise("bench", "Bench", [[75, 8], [70, 12]])]);
  const prior = [
    { exerciseId: "bench", topWeightKg: 70, maxReps: 10, bestE1rmKg: 93.33 },
    { exerciseId: "bench", topWeightKg: 65, maxReps: 11, bestE1rmKg: 86 },
  ];

  it("reports each beaten record with its previous value", () => {
    const records = findRecords(state, prior);
    expect(records.map((r) => [r.type, r.previousValue, r.value, r.improvement, r.weightKg, r.reps])).toEqual([
      ["max_weight", 70, 75, 5, 75, 8],
      ["max_reps", 11, 12, 1, 70, 12],
      ["best_e1rm", 93.33, 98, 4.67, 70, 12],
    ]);
  });

  it("does not report first-ever values or ties", () => {
    expect(findRecords(state, [])).toEqual([]);
    expect(findRecords(state, [{ exerciseId: "bench", topWeightKg: 75, maxReps: 12, bestE1rmKg: 98 }])).toEqual([]);
  });

  it("ignores warm-ups and unfinished sets", () => {
    const heavy = workout([exercise("bench", "Bench", [[200, 20, { warmup: true }], [300, 5, { undone: true }], [60, 5]])]);
    expect(findRecords(heavy, prior)).toEqual([]);
  });

  it("marks the set that set the record", () => {
    const summary = buildWorkoutSummary({ ...base, state, priorBests: prior });
    expect(summary.exercises[0].sets[0].records).toEqual(["max_weight"]);
    expect(summary.exercises[0].sets[1].records).toEqual(["max_reps", "best_e1rm"]);
    expect(summary.stats.recordCount).toBe(3);
  });
});

describe("equivalent workouts", () => {
  const session = (id: string, name: string, workoutDayId: string | null): PriorSession => ({ id, name, workoutDayId, startedAt: "2026-11-01T10:00:00Z", volumeKg: 100 });
  const prior = [session("day", "Renamed", "d1"), session("name", " push ", null), session("other", "Legs", "d2"), session("empty", "Workout", null)];

  it("matches the same plan day or the same name", () => {
    expect(equivalentSessions({ name: "Push", workoutDayId: "d1" }, prior).map((s) => s.id)).toEqual(["day", "name"]);
  });

  it("never treats the default name as the same workout", () => {
    expect(equivalentSessions({ name: "Workout", workoutDayId: null }, prior)).toEqual([]);
  });
});

describe("comparison", () => {
  const previous = workout([exercise("bench", "Bench", [[70, 10], [70, 8]]), exercise("dropped", "Dropped", [[10, 10]])], {
    sessionId: "before",
    startedAt: "2026-11-01T10:00:00Z",
    endedAt: "2026-11-01T11:15:00Z",
  });
  const state = workout([exercise("bench", "Bench", [[75, 10], [75, 9]]), exercise("added", "Added", [[20, 10]])]);

  it("compares totals and only exercises present in both", () => {
    const { comparison } = buildWorkoutSummary({ ...base, state, equivalent: previous });
    expect(comparison).toMatchObject({
      sessionId: "before",
      volumeChangeKg: 1625 - 1360,
      volumeChangePercent: 19.5,
      durationChangeMinutes: -10,
      onlyThisSession: ["Added"],
      onlyPreviousSession: ["Dropped"],
    });
    expect(comparison!.exercises).toHaveLength(1);
    expect(comparison!.exercises[0]).toMatchObject({ exerciseId: "bench", topWeightChangeKg: 5, repsChange: 1, volumeChangeKg: 165, e1rmChangeKg: 6.67 });
  });

  it("is absent without an equivalent workout", () => {
    expect(buildWorkoutSummary({ ...base, state }).comparison).toBeNull();
  });
});

describe("muscleBreakdown", () => {
  const muscles = new Map<string, ExerciseMuscles>([
    ["bench", { primary: { id: 1, name: "Chest" }, secondary: [{ id: 2, name: "Triceps" }] }],
    ["pushdown", { primary: { id: 2, name: "Triceps" }, secondary: [] }],
  ]);

  it("counts secondary muscles as half and skips unclassified exercises", () => {
    const result = muscleBreakdown(
      workout([exercise("bench", "Bench", [[100, 10], [100, 10]]), exercise("pushdown", "Pushdown", [[20, 10]]), exercise("gone", "Gone", [[50, 10]])]),
      muscles,
    );
    expect(result).toEqual([
      { id: 1, name: "Chest", volumeKg: 2000, sets: 2 },
      { id: 2, name: "Triceps", volumeKg: 1200, sets: 2 },
    ]);
  });
});

describe("highlights", () => {
  const titles = (input: Partial<Parameters<typeof buildWorkoutSummary>[0]>) =>
    buildWorkoutSummary({ ...base, state: workout([exercise("bench", "Bench", [[70, 10]])]), ...input }).highlights.map((h) => h.title);

  it("has nothing to say about a plain single-exercise first workout", () => {
    expect(titles({})).toEqual([]);
  });

  it("announces one record per exercise, preferring the actual lift", () => {
    const list = titles({ priorBests: [{ exerciseId: "bench", topWeightKg: 60, maxReps: 8, bestE1rmKg: 70 }] });
    expect(list).toEqual(["New Bench record"]);
    const summary = buildWorkoutSummary({ ...base, state: workout([exercise("bench", "Bench", [[70, 10]])]), priorBests: [{ exerciseId: "bench", topWeightKg: 60, maxReps: 8, bestE1rmKg: 70 }] });
    expect(summary.highlights[0].detail).toBe("Heaviest weight: 70 kg × 10");
  });

  it("announces a best session volume only against equivalent workouts", () => {
    const prior: PriorSession = { id: "p", name: "Push", workoutDayId: null, startedAt: "2026-11-01T10:00:00Z", volumeKg: 500 };
    expect(titles({ equivalentPrior: [prior] })).toContain("Highest volume recorded for Push");
    expect(titles({ equivalentPrior: [{ ...prior, volumeKg: 700 }] })).not.toContain("Highest volume recorded for Push");
  });

  it("names the top exercise only when there is more than one", () => {
    const state = workout([exercise("bench", "Bench", [[70, 10]]), exercise("fly", "Fly", [[15, 10]])]);
    expect(titles({ state })).toEqual(["Most volume: Bench"]);
  });

  it("reports progress against last time, once per exercise", () => {
    const previous = { bench: { sessionId: "p", startedAt: "2026-11-01T10:00:00Z", sets: [{ setNumber: 1, weightKg: 65, reps: 10, rpe: null, isWarmup: false }] } };
    expect(titles({ previous })).toEqual(["Heavier Bench"]);
  });
});

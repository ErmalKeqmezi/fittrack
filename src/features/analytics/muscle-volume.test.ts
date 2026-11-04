import { describe, expect, it } from "vitest";

import { muscleGroupVolume, periodWeeks, type ExerciseMuscles } from "./calculations";

const chest = { id: 1, name: "Chest" };
const triceps = { id: 2, name: "Triceps" };
const delts = { id: 3, name: "Front Delts" };
const muscles = new Map<string, ExerciseMuscles>([
  ["bench", { primary: chest, secondary: [triceps, delts] }],
  ["pushdown", { primary: triceps, secondary: [] }],
]);

describe("muscleGroupVolume", () => {
  it("counts primary muscles fully and secondary muscles as half", () => {
    const result = muscleGroupVolume(
      [
        { exerciseId: "bench", workingSets: 4 },
        { exerciseId: "bench", workingSets: 4 },
        { exerciseId: "pushdown", workingSets: 3 },
      ],
      muscles,
      2,
    );
    expect(result).toEqual([
      { id: 1, name: "Chest", sets: 8, setsPerWeek: 4 },
      { id: 2, name: "Triceps", sets: 7, setsPerWeek: 3.5 },
      { id: 3, name: "Front Delts", sets: 4, setsPerWeek: 2 },
    ]);
  });

  it("skips unknown exercises and handles no data", () => {
    expect(muscleGroupVolume([{ exerciseId: "gone", workingSets: 5 }], muscles, 1)).toEqual([]);
  });
});

describe("periodWeeks", () => {
  it("uses the range, else the first workout, and never less than a week", () => {
    expect(periodWeeks("2026-10-04", null, "2026-11-02")).toBeCloseTo(30 / 7);
    expect(periodWeeks(null, "2026-10-06", "2026-11-02")).toBe(4);
    expect(periodWeeks("2026-11-01", null, "2026-11-02")).toBe(1);
    expect(periodWeeks(null, null, "2026-11-02")).toBe(1);
  });
});

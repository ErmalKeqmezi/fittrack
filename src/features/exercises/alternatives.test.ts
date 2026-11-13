import { describe, expect, it } from "vitest";

import { movementPattern, suggestAlternatives } from "./alternatives";
import type { Exercise, MuscleGroup } from "./types";

const muscle = (id: number, name: string): MuscleGroup => ({ id, slug: name.toLowerCase(), name, bodyRegion: "chest" });
const chest = muscle(1, "Chest");
const triceps = muscle(2, "Triceps");
const delts = muscle(3, "Front Delts");
const lats = muscle(4, "Lats");

function exercise(name: string, primary: MuscleGroup, secondary: MuscleGroup[] = [], over: Partial<Exercise> = {}): Exercise {
  return { id: name, name, description: null, equipment: "barbell", category: "compound", isCustom: false, isArchived: false, primaryMuscle: primary, secondaryMuscles: secondary, ...over };
}

const bench = exercise("Barbell Bench Press", chest, [triceps, delts]);
const library = [
  bench,
  exercise("Dumbbell Bench Press", chest, [triceps, delts], { equipment: "dumbbell" }),
  exercise("Machine Chest Press", chest, [triceps], { equipment: "machine" }),
  exercise("Dumbbell Fly", chest, [], { equipment: "dumbbell", category: "isolation" }),
  exercise("Close-Grip Bench Press", triceps, [chest, delts]),
  exercise("Overhead Press", delts, [triceps]),
  exercise("Lat Pulldown", lats, []),
  exercise("Old Chest Press", chest, [triceps], { isArchived: true }),
  exercise("My Smith Press", chest, [triceps, delts], { equipment: "smith_machine", isCustom: true }),
];

describe("movementPattern", () => {
  it("groups exercises by the kind of movement in their name", () => {
    expect(movementPattern("Barbell Bench Press")).toBe("press");
    expect(movementPattern("Push-Up")).toBe("press");
    expect(movementPattern("Pec Deck")).toBe("fly");
    expect(movementPattern("Leg Press")).toBe("squat");
    expect(movementPattern("Triceps Pushdown")).toBe("extension");
    expect(movementPattern("Chin-Up")).toBe("pulldown");
    expect(movementPattern("Farmer's Carry")).toBe("carry");
    expect(movementPattern("Something Odd")).toBeNull();
  });
});

describe("suggestAlternatives", () => {
  const names = (list: Exercise[]) => list.map((e) => e.name);

  it("puts the same main muscle and movement first, then related exercises", () => {
    expect(names(suggestAlternatives(bench, library))).toEqual([
      "Dumbbell Bench Press",
      "My Smith Press",
      "Machine Chest Press",
      "Dumbbell Fly",
      "Close-Grip Bench Press",
      "Overhead Press",
    ]);
  });

  it("leaves out the exercise itself, archived ones, unrelated ones and excluded ones", () => {
    const result = names(suggestAlternatives(bench, library, new Set(["Dumbbell Bench Press"])));
    expect(result).not.toContain("Barbell Bench Press");
    expect(result).not.toContain("Old Chest Press");
    expect(result).not.toContain("Lat Pulldown");
    expect(result).not.toContain("Dumbbell Bench Press");
  });

  it("includes custom exercises", () => {
    expect(names(suggestAlternatives(bench, library))).toContain("My Smith Press");
  });

  it("returns nothing when the library has no related exercise", () => {
    expect(suggestAlternatives(exercise("Lat Pulldown", lats), [bench])).toEqual([]);
  });
});

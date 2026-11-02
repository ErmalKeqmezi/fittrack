import { describe, expect, it } from "vitest";

import { defaultFilters, filterExercises, filtersToParams, parseFilters } from "./filters";
import { exerciseFormSchema } from "./schemas";
import type { Exercise, MuscleGroup } from "./types";

const chest: MuscleGroup = { id: 1, slug: "chest", name: "Chest", bodyRegion: "chest" };
const triceps: MuscleGroup = { id: 10, slug: "triceps", name: "Triceps", bodyRegion: "triceps" };
const quads: MuscleGroup = { id: 12, slug: "quadriceps", name: "Quadriceps", bodyRegion: "legs" };

const make = (name: string, primary: MuscleGroup, extra: Partial<Exercise> = {}): Exercise => ({
  id: name,
  name,
  description: null,
  equipment: "barbell",
  category: "compound",
  isCustom: false,
  isArchived: false,
  primaryMuscle: primary,
  secondaryMuscles: [],
  ...extra,
});

const library = [
  make("Barbell Bench Press", chest, { secondaryMuscles: [triceps] }),
  make("Dumbbell Fly", chest, { equipment: "dumbbell", category: "isolation" }),
  make("Back Squat", quads),
  make("Triceps Pushdown", triceps, { equipment: "cable", category: "isolation" }),
  make("My Press", chest, { isCustom: true }),
  make("Old Press", chest, { isCustom: true, isArchived: true }),
];

const names = (list: Exercise[]) => list.map((e) => e.name);

describe("filterExercises", () => {
  it("hides archived exercises by default and sorts alphabetically", () => {
    expect(names(filterExercises(library, defaultFilters))).toEqual([
      "Back Squat",
      "Barbell Bench Press",
      "Dumbbell Fly",
      "My Press",
      "Triceps Pushdown",
    ]);
  });

  it("matches every word across name, muscles and equipment", () => {
    expect(names(filterExercises(library, { ...defaultFilters, query: "press triceps" }))).toEqual([
      "Barbell Bench Press",
    ]);
    expect(names(filterExercises(library, { ...defaultFilters, query: "BENCH" }))).toEqual(["Barbell Bench Press"]);
  });

  it("ranks names containing more of the query words first", () => {
    const presses = [make("Overhead Press", chest, { secondaryMuscles: [triceps] }), make("Close-Grip Bench Press", triceps), make("Triceps Dip", triceps)];
    expect(names(filterExercises(presses, { ...defaultFilters, query: "press tri" }))).toEqual([
      "Close-Grip Bench Press",
      "Overhead Press",
    ]);
  });

  it("ranks name prefix matches first", () => {
    expect(names(filterExercises(library, { ...defaultFilters, query: "triceps" }))).toEqual([
      "Triceps Pushdown",
      "Barbell Bench Press",
    ]);
  });

  it("filters by region, equipment, category and source", () => {
    expect(names(filterExercises(library, { ...defaultFilters, region: "legs" }))).toEqual(["Back Squat"]);
    expect(names(filterExercises(library, { ...defaultFilters, equipment: "cable" }))).toEqual(["Triceps Pushdown"]);
    expect(names(filterExercises(library, { ...defaultFilters, region: "chest", category: "isolation" }))).toEqual([
      "Dumbbell Fly",
    ]);
    expect(names(filterExercises(library, { ...defaultFilters, source: "custom", showArchived: true }))).toEqual([
      "My Press",
      "Old Press",
    ]);
  });
});

describe("URL filters", () => {
  it("round-trips and ignores unknown values", () => {
    const filters = { ...defaultFilters, query: "row", region: "back" as const, source: "custom" as const };
    expect(parseFilters(filtersToParams(filters))).toEqual(filters);
    expect(parseFilters(new URLSearchParams("region=wings&equipment=laser&source=x"))).toEqual(defaultFilters);
  });
});

describe("exerciseFormSchema", () => {
  const valid = {
    name: "  Landmine Press ",
    description: "",
    primaryMuscleGroupId: "6",
    secondaryMuscleGroupIds: ["10", "6", "10"],
    equipment: "barbell",
    category: "compound",
  };

  it("trims, coerces ids and removes the primary from secondary muscles", () => {
    const result = exerciseFormSchema.parse(valid);
    expect(result.name).toBe("Landmine Press");
    expect(result.primaryMuscleGroupId).toBe(6);
    expect(result.secondaryMuscleGroupIds).toEqual([10]);
  });

  it("rejects unknown equipment and missing primary muscle", () => {
    expect(exerciseFormSchema.safeParse({ ...valid, equipment: "laser" }).success).toBe(false);
    expect(exerciseFormSchema.safeParse({ ...valid, primaryMuscleGroupId: "" }).success).toBe(false);
  });
});

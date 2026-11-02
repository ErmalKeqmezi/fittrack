import { BODY_REGIONS, CATEGORIES, EQUIPMENT, SOURCES, type BodyRegion, type Category, type Equipment, type Source } from "./constants";
import type { Exercise } from "./types";

export type ExerciseFilters = {
  query: string;
  region: BodyRegion | null;
  equipment: Equipment | null;
  category: Category | null;
  source: Source;
  showArchived: boolean;
};

export const defaultFilters: ExerciseFilters = {
  query: "",
  region: null,
  equipment: null,
  category: null,
  source: "all",
  showArchived: false,
};

function pick<T extends string>(values: readonly T[], value: string | null | undefined): T | null {
  return value && (values as readonly string[]).includes(value) ? (value as T) : null;
}

/** Parses filters from URL search params; unknown values fall back to defaults. */
export function parseFilters(params: URLSearchParams): ExerciseFilters {
  return {
    query: (params.get("q") ?? "").slice(0, 80),
    region: pick(BODY_REGIONS, params.get("region")),
    equipment: pick(EQUIPMENT, params.get("equipment")),
    category: pick(CATEGORIES, params.get("category")),
    source: pick(SOURCES, params.get("source")) ?? "all",
    showArchived: params.get("archived") === "1",
  };
}

export function filtersToParams(filters: ExerciseFilters) {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.region) params.set("region", filters.region);
  if (filters.equipment) params.set("equipment", filters.equipment);
  if (filters.category) params.set("category", filters.category);
  if (filters.source !== "all") params.set("source", filters.source);
  if (filters.showArchived) params.set("archived", "1");
  return params;
}

export function hasActiveFilters(filters: ExerciseFilters) {
  return filtersToParams(filters).toString() !== "";
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Every search word must appear in the exercise name, its muscles or its
 * equipment ("db curl" style abbreviations are not guessed).
 */
function matchesQuery(exercise: Exercise, query: string) {
  const words = normalize(query).split(" ").filter(Boolean);
  if (!words.length) return true;
  const haystack = normalize(
    [
      exercise.name,
      exercise.primaryMuscle.name,
      ...exercise.secondaryMuscles.map((m) => m.name),
      exercise.equipment.replace("_", " "),
    ].join(" "),
  );
  return words.every((word) => haystack.includes(word));
}

/**
 * Higher is better: name starting with the query, then query words found in
 * the name, then words matching the primary muscle.
 */
function score(exercise: Exercise, query: string) {
  const q = normalize(query);
  if (!q) return 0;
  const name = normalize(exercise.name);
  const words = q.split(" ");
  const nameWords = name.split(" ");
  const wordHits = words.filter((w) => name.includes(w)).length;
  const exactWordHits = words.filter((w) => nameWords.some((nw) => nw.startsWith(w))).length;
  const primary = normalize(exercise.primaryMuscle.name);
  const primaryHits = words.filter((w) => primary.includes(w)).length;
  return (name.startsWith(q) ? 100 : 0) + wordHits * 10 + primaryHits * 5 + exactWordHits;
}

export function filterExercises(exercises: Exercise[], filters: ExerciseFilters) {
  return exercises
    .filter((e) => filters.showArchived || !e.isArchived)
    .filter((e) => !filters.region || e.primaryMuscle.bodyRegion === filters.region)
    .filter((e) => !filters.equipment || e.equipment === filters.equipment)
    .filter((e) => !filters.category || e.category === filters.category)
    .filter((e) => filters.source === "all" || (filters.source === "custom") === e.isCustom)
    .filter((e) => matchesQuery(e, filters.query))
    .sort((a, b) => score(b, filters.query) - score(a, filters.query) || a.name.localeCompare(b.name));
}

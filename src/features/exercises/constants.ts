// Values mirror the CHECK constraints in supabase/migrations/*_core_schema.sql.

export const BODY_REGIONS = ["chest", "back", "shoulders", "biceps", "triceps", "forearms", "legs", "core"] as const;
export type BodyRegion = (typeof BODY_REGIONS)[number];

export const BODY_REGION_LABELS: Record<BodyRegion, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  legs: "Legs",
  core: "Core",
};

export const EQUIPMENT = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "kettlebell",
  "smith_machine",
  "ez_bar",
  "band",
  "other",
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  machine: "Machine",
  cable: "Cable",
  bodyweight: "Bodyweight",
  kettlebell: "Kettlebell",
  smith_machine: "Smith machine",
  ez_bar: "EZ bar",
  band: "Band",
  other: "Other",
};

export const CATEGORIES = ["compound", "isolation"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  compound: "Compound",
  isolation: "Isolation",
};

export const SOURCES = ["all", "built_in", "custom"] as const;
export type Source = (typeof SOURCES)[number];

export const SOURCE_LABELS: Record<Source, string> = {
  all: "Source",
  built_in: "Built-in",
  custom: "Mine",
};

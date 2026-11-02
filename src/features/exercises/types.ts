import type { BodyRegion, Category, Equipment } from "./constants";

export type MuscleGroup = {
  id: number;
  slug: string;
  name: string;
  bodyRegion: BodyRegion;
};

export type Exercise = {
  id: string;
  name: string;
  description: string | null;
  equipment: Equipment;
  category: Category;
  isCustom: boolean;
  isArchived: boolean;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
};

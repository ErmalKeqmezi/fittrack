import type { Category, Equipment } from "@/features/exercises/constants";

import type { TemplateKey } from "./templates";

export type PlanExercise = {
  id: string;
  position: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restSeconds: number | null;
  notes: string | null;
  exercise: {
    id: string;
    name: string;
    equipment: Equipment;
    category: Category;
    primaryMuscle: string;
    isArchived: boolean;
  };
};

export type PlanDay = {
  id: string;
  name: string;
  position: number;
  weekday: number | null;
  isRestDay: boolean;
  notes: string | null;
  exercises: PlanExercise[];
};

export type Plan = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  templateKey: TemplateKey | null;
  createdAt: string;
  updatedAt: string;
  days: PlanDay[];
};

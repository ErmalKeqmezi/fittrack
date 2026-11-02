import "server-only";

import { cache } from "react";

import type { Category, Equipment } from "@/features/exercises/constants";
import { createClient } from "@/lib/supabase/server";

import type { TemplateKey } from "./templates";
import type { Plan, PlanDay } from "./types";

const PLAN_COLUMNS = `
  id, name, description, is_active, template_key, created_at, updated_at,
  workout_days(
    id, name, position, weekday, is_rest_day, notes,
    plan_exercises(
      id, position, target_sets, target_reps_min, target_reps_max, rest_seconds, notes,
      exercises(id, name, equipment, category, is_archived,
        primary:muscle_groups!exercises_primary_muscle_group_id_fkey(name))
    )
  )
`;

type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  template_key: string | null;
  created_at: string;
  updated_at: string;
  workout_days: {
    id: string;
    name: string;
    position: number;
    weekday: number | null;
    is_rest_day: boolean;
    notes: string | null;
    plan_exercises: {
      id: string;
      position: number;
      target_sets: number;
      target_reps_min: number;
      target_reps_max: number;
      rest_seconds: number | null;
      notes: string | null;
      exercises: {
        id: string;
        name: string;
        equipment: string;
        category: string;
        is_archived: boolean;
        primary: { name: string } | null;
      } | null;
    }[];
  }[];
};

function toPlan(row: PlanRow): Plan {
  const days: PlanDay[] = [...row.workout_days]
    .sort((a, b) => a.position - b.position)
    .map((d) => ({
      id: d.id,
      name: d.name,
      position: d.position,
      weekday: d.weekday,
      isRestDay: d.is_rest_day,
      notes: d.notes,
      exercises: [...d.plan_exercises]
        .sort((a, b) => a.position - b.position)
        .filter((pe) => pe.exercises !== null)
        .map((pe) => ({
          id: pe.id,
          position: pe.position,
          targetSets: pe.target_sets,
          targetRepsMin: pe.target_reps_min,
          targetRepsMax: pe.target_reps_max,
          restSeconds: pe.rest_seconds,
          notes: pe.notes,
          exercise: {
            id: pe.exercises!.id,
            name: pe.exercises!.name,
            equipment: pe.exercises!.equipment as Equipment,
            category: pe.exercises!.category as Category,
            primaryMuscle: pe.exercises!.primary?.name ?? "",
            isArchived: pe.exercises!.is_archived,
          },
        })),
    }));

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    templateKey: row.template_key as TemplateKey | null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    days,
  };
}

/** All plans, active first, then most recently edited. */
export const listPlans = cache(async (): Promise<Plan[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_plans")
    .select(PLAN_COLUMNS)
    .order("is_active", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Could not load workout plans: ${error.message}`);
  return (data as unknown as PlanRow[]).map(toPlan);
});

export const getPlan = cache(async (id: string): Promise<Plan | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("workout_plans").select(PLAN_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load workout plan: ${error.message}`);
  return data ? toPlan(data as unknown as PlanRow) : null;
});

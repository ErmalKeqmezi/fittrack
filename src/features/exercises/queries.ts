import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import type { BodyRegion, Category, Equipment } from "./constants";
import type { Exercise, MuscleGroup } from "./types";

const EXERCISE_COLUMNS = `
  id, name, description, equipment, category, is_archived, user_id,
  primary:muscle_groups!exercises_primary_muscle_group_id_fkey(id, slug, name, body_region, sort_order),
  exercise_secondary_muscles(muscle_groups(id, slug, name, body_region, sort_order))
`;

type MuscleRow = { id: number; slug: string; name: string; body_region: string; sort_order: number };

type ExerciseRow = {
  id: string;
  name: string;
  description: string | null;
  equipment: string;
  category: string;
  is_archived: boolean;
  user_id: string | null;
  primary: MuscleRow | null;
  exercise_secondary_muscles: { muscle_groups: MuscleRow | null }[];
};

function toMuscle(row: MuscleRow): MuscleGroup {
  return { id: row.id, slug: row.slug, name: row.name, bodyRegion: row.body_region as BodyRegion };
}

function toExercise(row: ExerciseRow): Exercise {
  if (!row.primary) throw new Error(`Exercise ${row.id} has no primary muscle group`);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    equipment: row.equipment as Equipment,
    category: row.category as Category,
    isCustom: row.user_id !== null,
    isArchived: row.is_archived,
    primaryMuscle: toMuscle(row.primary),
    secondaryMuscles: row.exercise_secondary_muscles
      .map((s) => s.muscle_groups)
      .filter((m): m is MuscleRow => m !== null)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(toMuscle),
  };
}

/** The full library visible to the user (built-in + own custom, including archived). */
export const listExercises = cache(async (): Promise<Exercise[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("exercises").select(EXERCISE_COLUMNS).order("name");
  if (error) throw new Error(`Could not load exercises: ${error.message}`);
  return (data as unknown as ExerciseRow[]).map(toExercise);
});

export const getExercise = cache(async (id: string): Promise<Exercise | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("exercises").select(EXERCISE_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load exercise: ${error.message}`);
  return data ? toExercise(data as unknown as ExerciseRow) : null;
});

export const listMuscleGroups = cache(async (): Promise<MuscleGroup[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("muscle_groups")
    .select("id, slug, name, body_region, sort_order")
    .order("sort_order");
  if (error) throw new Error(`Could not load muscle groups: ${error.message}`);
  return data.map(toMuscle);
});

export type ExerciseUsage = {
  sessionCount: number;
  lastPerformedAt: string | null;
  lastTopSet: { weightKg: number; reps: number } | null;
  bestTopSet: { weightKg: number; reps: number; performedAt: string } | null;
  planCount: number;
};

/** Recorded history for one exercise (completed workouts only). */
export async function getExerciseUsage(exerciseId: string): Promise<ExerciseUsage> {
  const supabase = await createClient();
  const [bestsRes, plansRes] = await Promise.all([
    supabase
      .from("exercise_session_bests")
      .select("started_at, top_weight_kg, top_weight_reps")
      .eq("exercise_id", exerciseId)
      .order("started_at", { ascending: false }),
    supabase.from("plan_exercises").select("id", { count: "exact", head: true }).eq("exercise_id", exerciseId),
  ]);
  if (bestsRes.error) throw new Error(`Could not load exercise history: ${bestsRes.error.message}`);
  if (plansRes.error) throw new Error(`Could not load exercise usage: ${plansRes.error.message}`);

  const rows = bestsRes.data.map((r) => ({
    performedAt: r.started_at!,
    weightKg: Number(r.top_weight_kg ?? 0),
    reps: r.top_weight_reps ?? 0,
  }));
  const best = rows.reduce<(typeof rows)[number] | null>(
    (top, r) => (!top || r.weightKg > top.weightKg || (r.weightKg === top.weightKg && r.reps > top.reps) ? r : top),
    null,
  );

  return {
    sessionCount: rows.length,
    lastPerformedAt: rows[0]?.performedAt ?? null,
    lastTopSet: rows[0] ? { weightKg: rows[0].weightKg, reps: rows[0].reps } : null,
    bestTopSet: best,
    planCount: plansRes.count ?? 0,
  };
}

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 1000;

/**
 * Reads every row of a table. Supabase returns at most 1,000 rows per request,
 * so a long history would otherwise be cut off silently. RLS limits the rows to
 * the signed-in user (plus shared reference data).
 */
async function fetchAll<T>(supabase: SupabaseClient, table: string, orderBy: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order(orderBy, { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Could not export ${table}: ${error.message}`);
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) return rows;
  }
}

export async function loadExportTables() {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const [
    profiles,
    muscleGroups,
    exercises,
    exerciseSecondaryMuscles,
    workoutPlans,
    workoutDays,
    planExercises,
    workoutSessions,
    sessionExercises,
    exerciseSets,
    personalRecords,
    bodyMeasurements,
  ] = await Promise.all([
    fetchAll(supabase, "profiles", "id"),
    fetchAll(supabase, "muscle_groups", "id"),
    fetchAll(supabase, "exercises", "id"),
    fetchAll(supabase, "exercise_secondary_muscles", "exercise_id"),
    fetchAll(supabase, "workout_plans", "id"),
    fetchAll(supabase, "workout_days", "id"),
    fetchAll(supabase, "plan_exercises", "id"),
    fetchAll(supabase, "workout_sessions", "id"),
    fetchAll(supabase, "session_exercises", "id"),
    fetchAll(supabase, "exercise_sets", "id"),
    fetchAll(supabase, "personal_records", "id"),
    fetchAll(supabase, "body_measurements", "id"),
  ]);
  return {
    profiles,
    muscle_groups: muscleGroups,
    exercises,
    exercise_secondary_muscles: exerciseSecondaryMuscles,
    workout_plans: workoutPlans,
    workout_days: workoutDays,
    plan_exercises: planExercises,
    workout_sessions: workoutSessions,
    session_exercises: sessionExercises,
    exercise_sets: exerciseSets,
    personal_records: personalRecords,
    body_measurements: bodyMeasurements,
  };
}

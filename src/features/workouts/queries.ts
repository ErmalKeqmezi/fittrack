import "server-only";

import { cache } from "react";

import { readAllPages } from "@/lib/supabase/read-all";
import { createClient } from "@/lib/supabase/server";

import type { ExerciseMuscles } from "@/features/analytics/calculations";
import { listExercises } from "@/features/exercises/queries";

import { buildWorkoutSummary, equivalentSessions, type PriorBest, type PriorSession, type WorkoutSummary } from "./summary";
import { DEFAULT_REST_SECONDS } from "./tracker-state";
import type { PreviousPerformance, SessionStatus, TrackerState } from "./types";

export type InProgressWorkout = { id: string; name: string; startedAt: string };

export const getInProgressWorkout = cache(async (): Promise<InProgressWorkout | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id, name, started_at")
    .eq("status", "in_progress")
    .maybeSingle();
  if (error) throw new Error(`Could not load the current workout: ${error.message}`);
  return data ? { id: data.id, name: data.name, startedAt: data.started_at } : null;
});

export type LoadedWorkout = {
  state: TrackerState;
  planName: string | null;
  workoutDayId: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Loads a session as tracker state. Plan targets (if the day still exists) seed hints and rest times. */
export const getWorkout = cache(async (id: string): Promise<LoadedWorkout | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(
      `id, name, notes, status, started_at, ended_at, created_at, updated_at, workout_day_id,
       workout_plans(name),
       session_exercises(id, exercise_id, exercise_name, position, notes,
         exercise_sets(id, set_number, weight_kg, reps, rpe, is_warmup, is_completed))`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load the workout: ${error.message}`);
  if (!data) return null;

  const targets = new Map<string, { sets: number; repsMin: number; repsMax: number; restSeconds: number | null }>();
  if (data.workout_day_id) {
    const { data: planned } = await supabase
      .from("plan_exercises")
      .select("exercise_id, target_sets, target_reps_min, target_reps_max, rest_seconds")
      .eq("workout_day_id", data.workout_day_id)
      .order("position");
    for (const p of planned ?? []) {
      if (!targets.has(p.exercise_id)) {
        targets.set(p.exercise_id, { sets: p.target_sets, repsMin: p.target_reps_min, repsMax: p.target_reps_max, restSeconds: p.rest_seconds });
      }
    }
  }

  const status = data.status as SessionStatus;
  const exercises = [...data.session_exercises]
    .sort((a, b) => a.position - b.position)
    .map((se) => {
      const target = targets.get(se.exercise_id);
      const sets = [...se.exercise_sets]
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({
          id: s.id,
          weight: String(Number(s.weight_kg)),
          reps: String(s.reps),
          rpe: s.rpe == null ? "" : String(Number(s.rpe)),
          isWarmup: s.is_warmup,
          done: s.is_completed,
        }));
      // Empty rows are never stored, so an in-progress session gets them back
      // here: up to the plan's target sets, or one row to start typing in.
      if (status === "in_progress") {
        const wanted = Math.max(target?.sets ?? 1, 1);
        while (sets.length < wanted) {
          sets.push({ id: crypto.randomUUID(), weight: "", reps: "", rpe: "", isWarmup: false, done: false });
        }
      }

      return {
        id: se.id,
        exerciseId: se.exercise_id,
        name: se.exercise_name,
        notes: se.notes ?? "",
        showNotes: Boolean(se.notes),
        showRpe: sets.some((s) => s.rpe !== ""),
        restSeconds: target?.restSeconds ?? DEFAULT_REST_SECONDS,
        targets: target ? { sets: target.sets, repsMin: target.repsMin, repsMax: target.repsMax } : null,
        sets,
      };
    });

  return {
    state: {
      sessionId: data.id,
      status,
      name: data.name,
      notes: data.notes ?? "",
      startedAt: data.started_at,
      endedAt: data.ended_at,
      exercises,
      restTimer: null,
    },
    planName: data.workout_plans?.name ?? null,
    workoutDayId: data.workout_day_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
});

/** Last completed sets per exercise before `before`, excluding one session. */
export async function getPreviousPerformance(
  exerciseIds: string[],
  before: string,
  excludeSessionId?: string,
): Promise<Record<string, PreviousPerformance>> {
  if (!exerciseIds.length) return {};
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_previous_performance", {
    p_exercise_ids: [...new Set(exerciseIds)],
    p_before: before,
    ...(excludeSessionId ? { p_exclude_session_id: excludeSessionId } : {}),
  });
  if (error) throw new Error(`Could not load previous performance: ${error.message}`);

  const result: Record<string, PreviousPerformance> = {};
  for (const row of data) {
    const entry = (result[row.exercise_id] ??= { sessionId: row.session_id, startedAt: row.started_at, sets: [] });
    entry.sets.push({
      setNumber: row.set_number,
      weightKg: Number(row.weight_kg),
      reps: row.reps,
      rpe: row.rpe == null ? null : Number(row.rpe),
      isWarmup: row.is_warmup,
    });
  }
  return result;
}

export type HistoryEntry = {
  id: string;
  name: string;
  startedAt: string;
  endedAt: string | null;
  exerciseCount: number;
  workingSetCount: number;
  volumeKg: number;
};

export const HISTORY_PAGE_SIZE = 20;

export async function listWorkoutHistory(page: number): Promise<{ entries: HistoryEntry[]; total: number }> {
  const supabase = await createClient();
  const from = (page - 1) * HISTORY_PAGE_SIZE;
  const { data, error, count } = await supabase
    .from("session_summaries")
    .select("id, name, started_at, ended_at, exercise_count, working_set_count, volume_kg", { count: "exact" })
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .range(from, from + HISTORY_PAGE_SIZE - 1);
  if (error) throw new Error(`Could not load workout history: ${error.message}`);
  return {
    total: count ?? 0,
    entries: data.map((s) => ({
      id: s.id!,
      name: s.name!,
      startedAt: s.started_at!,
      endedAt: s.ended_at,
      exerciseCount: s.exercise_count ?? 0,
      workingSetCount: s.working_set_count ?? 0,
      volumeKg: Number(s.volume_kg ?? 0),
    })),
  };
}

/** The summary of a finished workout, calculated from what is saved right now. */
export async function getWorkoutSummary(workout: LoadedWorkout): Promise<WorkoutSummary> {
  const { state } = workout;
  const exerciseIds = [...new Set(state.exercises.map((e) => e.exerciseId))];
  const supabase = await createClient();

  const [previous, library, bestRows, sessionRows] = await Promise.all([
    getPreviousPerformance(exerciseIds, state.startedAt, state.sessionId),
    listExercises(),
    exerciseIds.length
      ? readAllPages("the workout summary", (from, to) =>
          supabase
            .from("exercise_session_bests")
            .select("session_exercise_id, exercise_id, top_weight_kg, max_reps, best_e1rm_kg")
            .in("exercise_id", exerciseIds)
            .lt("started_at", state.startedAt)
            .order("session_exercise_id")
            .range(from, to),
        )
      : [],
    readAllPages("the workout summary", (from, to) =>
      supabase
        .from("session_summaries")
        .select("id, name, workout_day_id, started_at, volume_kg")
        .eq("status", "completed")
        .lt("started_at", state.startedAt)
        .order("started_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
  ]);

  const priorBests: PriorBest[] = bestRows.map((row) => ({
    exerciseId: row.exercise_id ?? "",
    topWeightKg: Number(row.top_weight_kg ?? 0),
    maxReps: Number(row.max_reps ?? 0),
    bestE1rmKg: row.best_e1rm_kg === null ? null : Number(row.best_e1rm_kg),
  }));

  const priorSessions: PriorSession[] = sessionRows.map((row) => ({
    id: row.id ?? "",
    name: row.name ?? "",
    workoutDayId: row.workout_day_id,
    startedAt: row.started_at ?? "",
    volumeKg: Number(row.volume_kg ?? 0),
  }));
  const equivalentPrior = equivalentSessions({ name: state.name, workoutDayId: workout.workoutDayId }, priorSessions);
  const equivalent = equivalentPrior.length ? await getWorkout(equivalentPrior[0].id) : null;

  const muscles = new Map<string, ExerciseMuscles>(
    library.map((e) => [e.id, { primary: e.primaryMuscle, secondary: e.secondaryMuscles }]),
  );

  return buildWorkoutSummary({ state, previous, priorBests, equivalentPrior, equivalent: equivalent?.state ?? null, muscles });
}

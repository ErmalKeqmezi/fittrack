"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { routes } from "@/config/routes";
import { getCurrentUser } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

import { getPreviousPerformance } from "./queries";
import { snapshotSchema } from "./schemas";
import type { SessionSnapshot } from "./types";

export type SaveResult = { ok: true; savedAt: string } | { ok: false; message: string; retryable: boolean };
export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

/** A personal record this workout beat (first-ever logs are not reported). */
export type NewRecord = {
  exerciseName: string;
  recordType: "max_weight" | "max_reps" | "best_e1rm";
  value: number;
  weightKg: number;
  reps: number;
  previousValue: number;
};
export type FinishResult = { ok: true; records: NewRecord[] } | { ok: false; message: string };

const SESSION_EXPIRED = "Your session has expired. Sign in again.";

function revalidateWorkouts(sessionId?: string) {
  revalidatePath(routes.dashboard);
  revalidatePath(routes.progress, "layout");
  revalidatePath(routes.history);
  revalidatePath(routes.workout);
  revalidatePath("/exercises", "layout");
  if (sessionId) revalidatePath(`${routes.workouts}/${sessionId}`, "layout");
}

function describe(error: PostgrestError, fallback: string) {
  if (error.code === "22023") return error.message;
  if (error.code === "P0002") return "This workout no longer exists.";
  if (error.code === "23503") return "An exercise in this workout is no longer available.";
  if (error.code === "23514") return "Some values are out of range. Check weights, reps and RPE.";
  return fallback;
}

/** Starts a workout (optionally from a plan day) or resumes the one in progress. */
export async function startWorkout(workoutDayId: string | null): Promise<ActionResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SESSION_EXPIRED };
  if (workoutDayId !== null && !isUuid(workoutDayId)) return { ok: false, message: "Unknown plan day." };

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("start_workout_session", workoutDayId ? { p_workout_day_id: workoutDayId } : {});
  if (error) return { ok: false, message: describe(error, "Could not start the workout. Try again.") };

  revalidateWorkouts();
  redirect(`${routes.workouts}/${id}`);
}

async function persist(snapshot: SessionSnapshot): Promise<SaveResult> {
  const parsed = snapshotSchema.safeParse(snapshot);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid workout data.", retryable: false };
  }
  const s = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_workout_session", {
    p_session_id: s.sessionId,
    p_name: s.name,
    p_notes: s.notes,
    p_exercises: s.exercises,
    ...(s.startedAt ? { p_started_at: s.startedAt } : {}),
    ...(s.endedAt ? { p_ended_at: s.endedAt } : {}),
  });
  if (error) {
    const retryable = !["22023", "P0002", "23503", "23514"].includes(error.code);
    return { ok: false, message: describe(error, "Could not save. Retrying…"), retryable };
  }
  return { ok: true, savedAt: data };
}

/** Autosave: idempotent full snapshot, safe to retry. */
export async function saveWorkout(snapshot: SessionSnapshot): Promise<SaveResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SESSION_EXPIRED, retryable: false };
  return persist(snapshot);
}

/**
 * Saves the final snapshot, then completes the session. Unfinished sets are
 * dropped and personal records are recomputed; beaten records are returned.
 */
export async function finishWorkout(snapshot: SessionSnapshot): Promise<FinishResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SESSION_EXPIRED };
  const saved = await persist(snapshot);
  if (!saved.ok) return { ok: false, message: saved.message };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finish_workout_session", { p_session_id: snapshot.sessionId });
  if (error) return { ok: false, message: describe(error, "Could not finish the workout. Try again.") };

  revalidateWorkouts(snapshot.sessionId);
  return {
    ok: true,
    records: data.map((r) => ({
      exerciseName: r.exercise_name,
      recordType: r.record_type as NewRecord["recordType"],
      value: Number(r.value),
      weightKg: Number(r.weight_kg),
      reps: r.reps,
      previousValue: Number(r.previous_value),
    })),
  };
}

/** Saves edits to a completed workout. */
export async function saveWorkoutEdits(snapshot: SessionSnapshot): Promise<ActionResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SESSION_EXPIRED };
  const saved = await persist(snapshot);
  if (!saved.ok) return { ok: false, message: saved.message };
  revalidateWorkouts(snapshot.sessionId);
  return { ok: true, message: "Changes saved." };
}

/** Discards an in-progress workout. Completed workouts are deleted with deleteWorkout. */
export async function discardWorkout(sessionId: string): Promise<ActionResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SESSION_EXPIRED };
  if (!isUuid(sessionId)) return { ok: false, message: "Unknown workout." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("status", "in_progress")
    .select("id");
  if (error || !data.length) return { ok: false, message: "Could not discard the workout." };

  revalidateWorkouts();
  redirect(routes.workout);
}

export async function deleteWorkout(sessionId: string): Promise<ActionResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SESSION_EXPIRED };
  if (!isUuid(sessionId)) return { ok: false, message: "Unknown workout." };

  // The database function also refreshes the personal records it affected.
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_workout_session", { p_session_id: sessionId });
  if (error) return { ok: false, message: describe(error, "Could not delete the workout.") };

  revalidateWorkouts();
  revalidatePath(routes.progress, "layout");
  redirect(routes.history);
}

/** Previous performance for exercises added during a session. */
export async function loadPreviousPerformance(exerciseIds: string[], before: string, excludeSessionId: string) {
  if (!(await getCurrentUser())) return {};
  if (!exerciseIds.every(isUuid) || !isUuid(excludeSessionId) || Number.isNaN(Date.parse(before))) return {};
  return getPreviousPerformance(exerciseIds.slice(0, 30), before, excludeSessionId);
}

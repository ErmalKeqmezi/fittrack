"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { routes } from "@/config/routes";
import { getCurrentUser } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

import { getInProgressWorkout, getPreviousPerformance, getWorkout } from "./queries";
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

/** The session's status, or null if it doesn't exist. */
async function sessionStatus(sessionId: string) {
  if (!isUuid(sessionId)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("workout_sessions").select("status").eq("id", sessionId).maybeSingle();
  if (error) throw error;
  return data?.status ?? null;
}

/**
 * Autosave: idempotent full snapshot, safe to retry. A late save must never
 * reach a finished workout: saving into a completed session would mark
 * unfinished rows as completed and bring back dropped exercises.
 */
export async function saveWorkout(snapshot: SessionSnapshot): Promise<SaveResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SESSION_EXPIRED, retryable: false };
  if ((await sessionStatus(snapshot.sessionId)) === "completed") return { ok: true, savedAt: new Date().toISOString() };
  return persist(snapshot);
}

/**
 * Saves the final snapshot, then completes the session. Unfinished sets are
 * dropped and personal records are recomputed; beaten records are returned.
 */
export async function finishWorkout(snapshot: SessionSnapshot): Promise<FinishResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SESSION_EXPIRED };

  // A retry after a lost response: it already saved, so just open the summary.
  if ((await sessionStatus(snapshot.sessionId)) === "completed") return { ok: true, records: [] };

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

/** Saves the notes of a workout without touching its sets. */
export async function saveSessionNotes(sessionId: string, notes: string): Promise<ActionResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SESSION_EXPIRED };
  if (!isUuid(sessionId)) return { ok: false, message: "Unknown workout." };
  const trimmed = notes.trim();
  if (trimmed.length > 2000) return { ok: false, message: "Keep notes under 2,000 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .update({ notes: trimmed || null })
    .eq("id", sessionId)
    .select("id");
  if (error || !data.length) return { ok: false, message: "Could not save your notes. Try again." };

  revalidatePath(`${routes.workouts}/${sessionId}`, "layout");
  return { ok: true, message: "Notes saved." };
}

export type RepeatResult = { ok: true; sessionId: string; resumed: boolean } | { ok: false; message: string };

/**
 * Starts a new workout like a finished one, through the normal start flow: from
 * its plan day when that still exists, otherwise with the same exercises. Sets
 * are logged fresh and the finished workout is not changed. A workout already
 * in progress is resumed instead, because only one can run at a time.
 */
export async function repeatWorkout(sessionId: string): Promise<RepeatResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SESSION_EXPIRED };
  if (!isUuid(sessionId)) return { ok: false, message: "Unknown workout." };

  const inProgress = await getInProgressWorkout();
  if (inProgress) return { ok: true, sessionId: inProgress.id, resumed: true };

  const source = await getWorkout(sessionId);
  if (!source) return { ok: false, message: "This workout no longer exists." };

  const supabase = await createClient();
  const fromPlan = source.workoutDayId
    ? await supabase.rpc("start_workout_session", { p_workout_day_id: source.workoutDayId })
    : null;
  // The plan day may have become a rest day; fall back to the workout's own exercises.
  const started = fromPlan && !fromPlan.error ? fromPlan : await supabase.rpc("start_workout_session", {});
  if (started.error) return { ok: false, message: describe(started.error, "Could not start the workout. Try again.") };
  const id = started.data;

  const { count, error: countError } = await supabase
    .from("session_exercises")
    .select("id", { count: "exact", head: true })
    .eq("session_id", id);
  if (countError) return { ok: false, message: "Could not start the workout. Try again." };

  if (!count) {
    const seen = new Set<string>();
    const exercises = source.state.exercises.filter((e) => !seen.has(e.exerciseId) && seen.add(e.exerciseId));
    const saved = await persist({
      sessionId: id,
      name: source.state.name,
      notes: "",
      exercises: exercises.map((e) => ({ id: crypto.randomUUID(), exercise_id: e.exerciseId, notes: "", sets: [] })),
    });
    if (!saved.ok) return { ok: false, message: saved.message };
  }

  revalidateWorkouts();
  return { ok: true, sessionId: id, resumed: false };
}

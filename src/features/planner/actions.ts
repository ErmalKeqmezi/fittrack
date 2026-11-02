"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { routes } from "@/config/routes";
import { getCurrentUser } from "@/features/auth/queries";
import { toFieldErrors, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";


import { addExercisesSchema, daySchema, planDetailsSchema, targetsSchema, type DayInput, type PlanDetailsInput, type TargetsInput } from "./schemas";
import { getTemplate, templateExerciseNames, templateToPlanDays } from "./templates";

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };
export type PlanFormState = FormState<keyof PlanDetailsInput>;
export type DayFormState = FormState<keyof DayInput>;
export type TargetsFormState = FormState<keyof TargetsInput>;

const SESSION_EXPIRED = "Your session has expired. Sign in again.";

function revalidatePlans() {
  revalidatePath(routes.plans, "layout");
  revalidatePath(routes.dashboard);
}

/** Turns database errors into messages a person can act on. */
function describe(error: PostgrestError, fallback: string) {
  if (error.code === "22023") return error.message; // limits raised by the planner functions
  if (error.code === "P0002") return "This item no longer exists. Refresh the page.";
  if (error.code === "23503") return "That exercise is no longer available.";
  return fallback;
}

function formStrings<K extends string>(formData: FormData, keys: readonly K[]) {
  return Object.fromEntries(keys.map((k) => [k, formData.get(k) ?? ""])) as Record<K, FormDataEntryValue>;
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export async function createPlan(_prev: PlanFormState, formData: FormData): Promise<PlanFormState> {
  if (!(await getCurrentUser())) return { status: "error", message: SESSION_EXPIRED };
  const parsed = planDetailsSchema.safeParse(formStrings(formData, ["name", "description"]));
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("create_workout_plan", {
    p_name: parsed.data.name,
    p_description: parsed.data.description,
  });
  if (error) return { status: "error", message: describe(error, "Could not create the plan. Try again.") };

  revalidatePlans();
  redirect(`${routes.plans}/${id}`);
}

export async function createPlanFromTemplate(templateKey: string): Promise<ActionResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SESSION_EXPIRED };
  const template = getTemplate(templateKey);
  if (!template) return { ok: false, message: "Unknown template." };

  const supabase = await createClient();
  const names = templateExerciseNames(template);
  const { data: rows, error: lookupError } = await supabase
    .from("exercises")
    .select("id, name")
    .is("user_id", null)
    .in("name", names);
  if (lookupError) return { ok: false, message: "Could not load the template exercises." };

  const ids = new Map(rows.map((r) => [r.name, r.id]));
  if (ids.size !== names.length) return { ok: false, message: "Some template exercises are missing from the library." };

  const { data: id, error } = await supabase.rpc("create_workout_plan", {
    p_name: template.name,
    p_description: template.summary,
    p_template_key: template.key,
    p_days: templateToPlanDays(template, ids),
  });
  if (error) return { ok: false, message: describe(error, "Could not create the plan. Try again.") };

  revalidatePlans();
  redirect(`${routes.plans}/${id}`);
}

export async function updatePlanDetails(planId: string, _prev: PlanFormState, formData: FormData): Promise<PlanFormState> {
  if (!(await getCurrentUser())) return { status: "error", message: SESSION_EXPIRED };
  if (!isUuid(planId)) return { status: "error", message: "Unknown plan." };
  const parsed = planDetailsSchema.safeParse(formStrings(formData, ["name", "description"]));
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_plans")
    .update({ name: parsed.data.name, description: parsed.data.description || null })
    .eq("id", planId)
    .select("id");
  if (error || !data.length) return { status: "error", message: "Could not save the plan. Try again." };

  revalidatePlans();
  return { status: "success", message: "Plan saved." };
}

/** Deleting a plan keeps workout history: sessions only lose their link to it. */
export async function deletePlan(planId: string): Promise<ActionResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SESSION_EXPIRED };
  if (!isUuid(planId)) return { ok: false, message: "Unknown plan." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("workout_plans").delete().eq("id", planId).select("id");
  if (error || !data.length) return { ok: false, message: "Could not delete the plan." };

  revalidatePlans();
  redirect(routes.plans);
}

export async function setActivePlan(planId: string, active: boolean): Promise<ActionResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SESSION_EXPIRED };
  if (!isUuid(planId)) return { ok: false, message: "Unknown plan." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_active_plan", { p_plan_id: planId, p_active: active });
  if (error) return { ok: false, message: describe(error, "Could not update the plan.") };

  revalidatePlans();
  return { ok: true, message: active ? "Plan activated. Today's workout now follows it." : "Plan deactivated." };
}

// ---------------------------------------------------------------------------
// Days
// ---------------------------------------------------------------------------

function parseDay(formData: FormData) {
  return daySchema.safeParse({
    name: formData.get("name") ?? "",
    weekday: formData.get("weekday"),
    isRestDay: formData.get("isRestDay"),
    notes: formData.get("notes") ?? "",
  });
}

export async function addDay(planId: string, _prev: DayFormState, formData: FormData): Promise<DayFormState> {
  if (!(await getCurrentUser())) return { status: "error", message: SESSION_EXPIRED };
  if (!isUuid(planId)) return { status: "error", message: "Unknown plan." };
  const parsed = parseDay(formData);
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_workout_day", {
    p_plan_id: planId,
    p_name: parsed.data.name,
    ...(parsed.data.weekday ? { p_weekday: parsed.data.weekday } : {}),
    p_is_rest_day: parsed.data.isRestDay,
  });
  if (error) return { status: "error", message: describe(error, "Could not add the day. Try again.") };

  revalidatePlans();
  return { status: "success", message: "Day added." };
}

export async function updateDay(dayId: string, _prev: DayFormState, formData: FormData): Promise<DayFormState> {
  if (!(await getCurrentUser())) return { status: "error", message: SESSION_EXPIRED };
  if (!isUuid(dayId)) return { status: "error", message: "Unknown day." };
  const parsed = parseDay(formData);
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_workout_day", {
    p_day_id: dayId,
    p_name: parsed.data.name,
    // RPC args are typed non-null; SQL accepts null to clear the weekday.
    p_weekday: parsed.data.weekday as number,
    p_is_rest_day: parsed.data.isRestDay,
    p_notes: parsed.data.notes,
  });
  if (error) return { status: "error", message: describe(error, "Could not save the day. Try again.") };

  revalidatePlans();
  return { status: "success", message: "Day saved." };
}

export async function deleteDay(dayId: string): Promise<ActionResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SESSION_EXPIRED };
  if (!isUuid(dayId)) return { ok: false, message: "Unknown day." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("workout_days").delete().eq("id", dayId).select("id");
  if (error || !data.length) return { ok: false, message: "Could not delete the day." };

  revalidatePlans();
  return { ok: true, message: "Day removed." };
}

export async function moveDay(dayId: string, offset: -1 | 1): Promise<ActionResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SESSION_EXPIRED };
  if (!isUuid(dayId)) return { ok: false, message: "Unknown day." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("move_workout_day", { p_day_id: dayId, p_offset: offset });
  if (error) return { ok: false, message: describe(error, "Could not move the day.") };

  revalidatePlans();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Exercises in a day
// ---------------------------------------------------------------------------

const DEFAULT_TARGETS = { sets: 3, repsMin: 8, repsMax: 12, restSeconds: 90 } as const;

/** Adds exercises with default targets (3 × 8–12, 90 s rest); edit them afterwards. */
export async function addPlanExercises(dayId: string, exerciseIds: string[]): Promise<ActionResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SESSION_EXPIRED };
  if (!isUuid(dayId)) return { ok: false, message: "Unknown day." };
  const parsed = addExercisesSchema.safeParse({ exerciseIds });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Choose at least one exercise." };

  const supabase = await createClient();
  let added = 0;
  for (const exerciseId of parsed.data.exerciseIds) {
    const { error } = await supabase.rpc("add_plan_exercise", {
      p_day_id: dayId,
      p_exercise_id: exerciseId,
      p_target_sets: DEFAULT_TARGETS.sets,
      p_target_reps_min: DEFAULT_TARGETS.repsMin,
      p_target_reps_max: DEFAULT_TARGETS.repsMax,
      p_rest_seconds: DEFAULT_TARGETS.restSeconds,
    });
    if (error) {
      revalidatePlans();
      const reason = describe(error, "Could not add the exercise.");
      return { ok: false, message: added ? `Added ${added}, then stopped: ${reason}` : reason };
    }
    added += 1;
  }

  revalidatePlans();
  return { ok: true, message: `Added ${added} exercise${added === 1 ? "" : "s"}. Set targets as needed (default 3 × 8–12).` };
}

export async function updatePlanExercise(planExerciseId: string, _prev: TargetsFormState, formData: FormData): Promise<TargetsFormState> {
  if (!(await getCurrentUser())) return { status: "error", message: SESSION_EXPIRED };
  if (!isUuid(planExerciseId)) return { status: "error", message: "Unknown exercise." };
  const parsed = targetsSchema.safeParse(formStrings(formData, ["targetSets", "targetRepsMin", "targetRepsMax", "restSeconds", "notes"]));
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plan_exercises")
    .update({
      target_sets: parsed.data.targetSets,
      target_reps_min: parsed.data.targetRepsMin,
      target_reps_max: parsed.data.targetRepsMax,
      rest_seconds: parsed.data.restSeconds,
      notes: parsed.data.notes || null,
    })
    .eq("id", planExerciseId)
    .select("id");
  if (error || !data.length) return { status: "error", message: "Could not save the targets. Try again." };

  revalidatePlans();
  return { status: "success", message: "Targets saved." };
}

export async function removePlanExercise(planExerciseId: string): Promise<ActionResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SESSION_EXPIRED };
  if (!isUuid(planExerciseId)) return { ok: false, message: "Unknown exercise." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("plan_exercises").delete().eq("id", planExerciseId).select("id");
  if (error || !data.length) return { ok: false, message: "Could not remove the exercise." };

  revalidatePlans();
  return { ok: true, message: "Exercise removed from the day." };
}

export async function movePlanExercise(planExerciseId: string, offset: -1 | 1): Promise<ActionResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SESSION_EXPIRED };
  if (!isUuid(planExerciseId)) return { ok: false, message: "Unknown exercise." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("move_plan_exercise", { p_plan_exercise_id: planExerciseId, p_offset: offset });
  if (error) return { ok: false, message: describe(error, "Could not move the exercise.") };

  revalidatePlans();
  return { ok: true };
}

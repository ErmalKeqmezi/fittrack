"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { routes } from "@/config/routes";
import { getCurrentUser } from "@/features/auth/queries";
import { toFieldErrors, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

import { exerciseFormDataToObject, exerciseFormSchema, type ExerciseFormInput } from "./schemas";

export type ExerciseFormState = FormState<keyof ExerciseFormInput>;
export type ExerciseMutationResult = { ok: true; message: string } | { ok: false; message: string };

function revalidateLibrary(id?: string) {
  revalidatePath(routes.exercises);
  if (id) revalidatePath(`${routes.exercises}/${id}`);
}

/** Creates (no id) or updates a custom exercise, then opens its detail page. */
export async function saveExercise(
  exerciseId: string | null,
  _prev: ExerciseFormState,
  formData: FormData,
): Promise<ExerciseFormState> {
  if (!(await getCurrentUser())) return { status: "error", message: "Your session has expired. Sign in again." };
  if (exerciseId !== null && !isUuid(exerciseId)) return { status: "error", message: "Unknown exercise." };

  const parsed = exerciseFormSchema.safeParse(exerciseFormDataToObject(formData));
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error) };

  const v = parsed.data;
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("save_custom_exercise", {
    p_name: v.name,
    p_description: v.description,
    p_primary_muscle_group_id: v.primaryMuscleGroupId,
    p_secondary_muscle_group_ids: v.secondaryMuscleGroupIds,
    p_equipment: v.equipment,
    p_category: v.category,
    ...(exerciseId ? { p_exercise_id: exerciseId } : {}),
  });

  if (error) {
    if (error.code === "23505") {
      const message = error.message.includes("built-in")
        ? "A built-in exercise already has this name. Use it, or choose a different name."
        : "You already have an exercise with this name.";
      return { status: "error", fieldErrors: { name: message } };
    }
    if (error.code === "P0002") return { status: "error", message: "This exercise no longer exists." };
    return { status: "error", message: "Could not save the exercise. Try again." };
  }

  revalidateLibrary(id);
  redirect(`${routes.exercises}/${id}`);
}

export async function setExerciseArchived(exerciseId: string, archived: boolean): Promise<ExerciseMutationResult> {
  if (!(await getCurrentUser())) return { ok: false, message: "Your session has expired. Sign in again." };
  if (!isUuid(exerciseId)) return { ok: false, message: "Unknown exercise." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .update({ is_archived: archived })
    .eq("id", exerciseId)
    .not("user_id", "is", null)
    .select("id");

  if (error || !data.length) return { ok: false, message: "Could not update the exercise." };
  revalidateLibrary(exerciseId);
  return { ok: true, message: archived ? "Exercise archived." : "Exercise restored." };
}

/**
 * Deletes a custom exercise. Exercises used in plans or workouts are protected
 * by foreign keys; the user is asked to archive them instead.
 */
export async function deleteExercise(exerciseId: string): Promise<ExerciseMutationResult> {
  if (!(await getCurrentUser())) return { ok: false, message: "Your session has expired. Sign in again." };
  if (!isUuid(exerciseId)) return { ok: false, message: "Unknown exercise." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .delete()
    .eq("id", exerciseId)
    .not("user_id", "is", null)
    .select("id");

  if (error?.code === "23503") {
    return { ok: false, message: "This exercise is used in your plans or workout history. Archive it instead." };
  }
  if (error || !data.length) return { ok: false, message: "Could not delete the exercise." };

  revalidateLibrary();
  redirect(routes.exercises);
}

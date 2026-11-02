import { z } from "zod";

import { CATEGORIES, EQUIPMENT } from "./constants";

const muscleGroupId = z.coerce.number().int().positive();

export const exerciseFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Use at least 2 characters.")
      .max(80, "Keep it under 80 characters."),
    description: z.string().trim().max(1000, "Keep it under 1000 characters."),
    primaryMuscleGroupId: z.coerce.number("Choose the main muscle group.").int().positive("Choose the main muscle group."),
    secondaryMuscleGroupIds: z.array(muscleGroupId).max(8, "Choose at most 8 secondary muscles."),
    equipment: z.enum(EQUIPMENT, "Choose the equipment."),
    category: z.enum(CATEGORIES, "Choose compound or isolation."),
  })
  .transform((values) => ({
    ...values,
    // The primary muscle is never also listed as secondary.
    secondaryMuscleGroupIds: [...new Set(values.secondaryMuscleGroupIds)].filter(
      (id) => id !== values.primaryMuscleGroupId,
    ),
  }));

export type ExerciseFormInput = z.input<typeof exerciseFormSchema>;
export type ExerciseFormValues = z.output<typeof exerciseFormSchema>;

/** Reads the exercise form fields out of FormData. */
export function exerciseFormDataToObject(formData: FormData) {
  return {
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    primaryMuscleGroupId: formData.get("primaryMuscleGroupId") ?? "",
    secondaryMuscleGroupIds: formData.getAll("secondaryMuscleGroupIds"),
    equipment: formData.get("equipment") ?? "",
    category: formData.get("category") ?? "",
  };
}

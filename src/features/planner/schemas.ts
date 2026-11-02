import { z } from "zod";

import { MAX_EXERCISES_PER_DAY } from "./constants";

export const planDetailsSchema = z.object({
  name: z.string().trim().min(1, "Give the plan a name.").max(80, "Keep it under 80 characters."),
  description: z.string().trim().max(1000, "Keep it under 1000 characters."),
});
export type PlanDetailsInput = z.input<typeof planDetailsSchema>;

const weekday = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.coerce.number().int().min(1).max(7).nullable(),
);

export const daySchema = z.object({
  name: z.string().trim().min(1, "Give the day a name.").max(60, "Keep it under 60 characters."),
  weekday,
  isRestDay: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  notes: z.string().trim().max(1000, "Keep it under 1000 characters.").default(""),
});
export type DayInput = z.input<typeof daySchema>;

const reps = z.coerce.number("Enter a number.").int("Whole numbers only.").min(1, "At least 1.").max(100, "At most 100.");

export const targetsSchema = z
  .object({
    targetSets: z.coerce.number("Enter a number.").int("Whole numbers only.").min(1, "At least 1 set.").max(20, "At most 20 sets."),
    targetRepsMin: reps,
    targetRepsMax: reps,
    restSeconds: z.preprocess(
      (v) => (v === "" || v == null ? null : v),
      z.coerce.number().int().min(0).max(900, "At most 15 minutes.").nullable(),
    ),
    notes: z.string().trim().max(500, "Keep it under 500 characters.").default(""),
  })
  .refine((v) => v.targetRepsMax >= v.targetRepsMin, {
    path: ["targetRepsMax"],
    message: "Max reps must be at least min reps.",
  });
export type TargetsInput = z.input<typeof targetsSchema>;

export const addExercisesSchema = z.object({
  exerciseIds: z.array(z.uuid()).min(1, "Choose at least one exercise.").max(MAX_EXERCISES_PER_DAY),
});

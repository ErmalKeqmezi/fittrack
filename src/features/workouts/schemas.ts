import { z } from "zod";

import { REPS_MAX, WEIGHT_MAX } from "./set-values";
import { MAX_SESSION_EXERCISES, MAX_SETS_PER_EXERCISE } from "./tracker-state";

/** Server-side validation of a tracker snapshot (mirrors DB constraints). */
export const snapshotSchema = z.object({
  sessionId: z.uuid(),
  name: z.string().trim().min(1).max(80),
  notes: z.string().max(2000),
  startedAt: z.iso.datetime({ offset: true }).optional(),
  endedAt: z.iso.datetime({ offset: true }).optional(),
  exercises: z
    .array(
      z.object({
        id: z.uuid(),
        exercise_id: z.uuid(),
        notes: z.string().max(1000),
        sets: z
          .array(
            z.object({
              id: z.uuid(),
              weight_kg: z.number().min(0).max(WEIGHT_MAX),
              reps: z.number().int().min(0).max(REPS_MAX),
              rpe: z
                .number()
                .min(1)
                .max(10)
                .refine((n) => Number.isInteger(n * 2), "RPE uses steps of 0.5.")
                .nullable(),
              is_warmup: z.boolean(),
              is_completed: z.boolean(),
            }),
          )
          .max(MAX_SETS_PER_EXERCISE),
      }),
    )
    .max(MAX_SESSION_EXERCISES),
}).refine((s) => !s.startedAt || !s.endedAt || new Date(s.endedAt) >= new Date(s.startedAt), {
  message: "The end time must be after the start time.",
  path: ["endedAt"],
});

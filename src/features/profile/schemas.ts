import { z } from "zod";

import { isValidTimeZone } from "@/lib/dates";

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name.").max(60, "Keep it under 60 characters."),
  timeZone: z.string().refine(isValidTimeZone, "Choose a valid timezone."),
});

export type ProfileInput = z.infer<typeof profileSchema>;

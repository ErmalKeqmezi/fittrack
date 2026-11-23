import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ReminderSettings = { enabled: boolean; time: string };

export async function getReminderSettings(userId: string): Promise<ReminderSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("workout_reminder_enabled, workout_reminder_time").eq("id", userId).maybeSingle();
  if (error) throw new Error(`Could not load your reminder settings: ${error.message}`);
  // Stored as "18:00:00"; the time input uses "18:00".
  return { enabled: data?.workout_reminder_enabled ?? false, time: (data?.workout_reminder_time ?? "18:00").slice(0, 5) };
}

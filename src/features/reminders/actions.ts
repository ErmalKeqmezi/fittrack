"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { routes } from "@/config/routes";
import { getCurrentUser } from "@/features/auth/queries";
import { isPushEndpoint } from "@/features/workouts/rest-alert-request";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true; message?: string } | { ok: false; message: string };

const SESSION_EXPIRED = "Your session has expired. Sign in again.";

const settingsSchema = z.object({
  enabled: z.boolean(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a time."),
});

export async function saveReminderSettings(enabled: boolean, time: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };
  const parsed = settingsSchema.safeParse({ enabled, time });
  if (!parsed.success) return { ok: false, message: "Pick a valid time." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ workout_reminder_enabled: parsed.data.enabled, workout_reminder_time: parsed.data.time })
    .eq("id", user.id)
    .select("id");
  if (error || !data.length) return { ok: false, message: "Could not save the reminder. Try again." };

  revalidatePath(routes.settings);
  return { ok: true, message: parsed.data.enabled ? `Reminder set for ${parsed.data.time} every day.` : "Daily reminder turned off." };
}

const subscriptionSchema = z.object({
  endpoint: z.string().max(2048).refine(isPushEndpoint),
  keys: z.object({ p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(256) }),
});

/** Remembers this device so reminders can reach it. */
export async function savePushSubscription(subscription: unknown): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };
  const parsed = subscriptionSchema.safeParse(subscription);
  if (!parsed.success) return { ok: false, message: "This device's notification details weren't valid." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, endpoint: parsed.data.endpoint, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth },
      { onConflict: "user_id,endpoint" },
    );
  if (error) return { ok: false, message: "Could not set up notifications on this device. Try again." };
  return { ok: true };
}

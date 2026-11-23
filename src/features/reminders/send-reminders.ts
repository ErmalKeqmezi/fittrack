import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

import type { Database } from "@/types/database";

export type ReminderDue = { user_id: string; display_name: string | null; endpoint: string; p256dh: string; auth: string };

/** "Ermal Keqmezi" becomes "Ermal"; no name becomes "there". */
export function reminderText(displayName: string | null) {
  const first = displayName?.trim().split(/\s+/)[0];
  return `Hey ${first || "there"}, don't forget to work out today`;
}

export function reminderPayload(displayName: string | null) {
  return JSON.stringify({ title: "FitTrack", body: reminderText(displayName), tag: "fittrack-reminder", url: "/workout" });
}

/**
 * Sends the daily workout reminders that are due. Runs on a schedule with no
 * user session: the database checks the job secret, picks who is due, marks
 * them sent and returns their devices. Never throws, so a bad run is logged
 * rather than retried into duplicate reminders.
 */
export async function sendWorkoutReminders(
  deps: { client?: SupabaseClient<Database>; send?: typeof webpush.sendNotification } = {},
): Promise<{ sent: number; failed: number }> {
  const secret = process.env.WORKOUT_REMINDER_SECRET;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.NEXT_PUBLIC_SITE_URL;
  if (!secret || !publicKey || !privateKey || !subject) {
    console.error("Workout reminders: not configured (secret or push keys missing).");
    return { sent: 0, failed: 0 };
  }

  const client =
    deps.client ??
    createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  const send = deps.send ?? webpush.sendNotification;

  const { data, error } = await client.rpc("claim_workout_reminders", { p_secret: secret });
  if (error) {
    console.error("Workout reminders: could not read who is due:", error.message);
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  for (const row of (data ?? []) as ReminderDue[]) {
    try {
      await send({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, reminderPayload(row.display_name), {
        vapidDetails: { subject, publicKey, privateKey },
        TTL: 60 * 60,
        urgency: "normal",
      });
      sent += 1;
    } catch (sendError) {
      failed += 1;
      const { statusCode, message } = sendError as Error & { statusCode?: number };
      // 404 and 410 mean the device is gone for good, so it is forgotten.
      if (statusCode === 404 || statusCode === 410) {
        await client.rpc("remove_push_subscription", { p_secret: secret, p_endpoint: row.endpoint });
      } else {
        console.error("Workout reminders: push failed:", statusCode ?? message);
      }
    }
  }
  return { sent, failed };
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

import type { Database } from "@/types/database";

import { REST_PUSH_GRACE_MS, restAlertPayload } from "./rest-alert-request";

export type RestAlertJob = { accessToken: string; userId: string; endpoint: string; endsAt: number };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Waits for a rest to end, then sends its push notification.
 *
 * Row Level Security decides everything, using the signed-in user's token, so
 * no service-role key is needed. Without a valid token and a matching alert, it
 * stops before waiting. When the rest ends the row is checked again: skipping or
 * changing the rest replaces or removes it, so an outdated alert is not sent.
 * Never throws: Netlify retries a failed background function.
 */
export async function deliverRestAlert(
  { accessToken, userId, endpoint, endsAt }: RestAlertJob,
  deps: { wait?: (ms: number) => Promise<unknown>; client?: SupabaseClient<Database>; send?: typeof webpush.sendNotification } = {},
) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.NEXT_PUBLIC_SITE_URL;
  if (!publicKey || !privateKey || !subject) {
    console.error("Rest alert: push keys are not configured.");
    return;
  }

  try {
    const client =
      deps.client ??
      createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
    const endsAtIso = new Date(endsAt).toISOString();
    const match = () => ({ user_id: userId, endpoint, ends_at: endsAtIso });

    const { data: pending } = await client.from("rest_alerts").select("endpoint").match(match()).maybeSingle();
    if (!pending) return;

    await (deps.wait ?? sleep)(Math.max(0, endsAt - Date.now()) + REST_PUSH_GRACE_MS);

    // Removing the row claims it, so a repeated request or a retry can't send twice.
    const { data: alert } = await client.from("rest_alerts").delete().match(match()).select("endpoint, p256dh, auth, label").maybeSingle();
    if (!alert) return;

    await (deps.send ?? webpush.sendNotification)({ endpoint: alert.endpoint, keys: { p256dh: alert.p256dh, auth: alert.auth } }, restAlertPayload(alert.label), {
      vapidDetails: { subject, publicKey, privateKey },
      TTL: 60,
      urgency: "high",
    });
  } catch (error) {
    const { statusCode, message } = error as Error & { statusCode?: number };
    console.error("Rest alert: push failed:", statusCode ?? message);
  }
}

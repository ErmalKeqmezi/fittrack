import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { after, NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";

import { getCurrentUser } from "@/features/auth/queries";
import {
  cancelRestAlertSchema,
  MAX_REST_PUSH_MS,
  REST_PUSH_GRACE_MS,
  restAlertPayload,
  scheduleRestAlertSchema,
} from "@/features/workouts/rest-alert-request";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

// How long the function may stay alive to wait for the rest to end.
export const maxDuration = 300;

const NOT_SIGNED_IN = () => NextResponse.json({ error: "Not signed in." }, { status: 401 });
const BAD_REQUEST = () => NextResponse.json({ error: "Invalid request." }, { status: 400 });

function vapidDetails() {
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  return publicKey && privateKey ? { subject: env.NEXT_PUBLIC_SITE_URL, publicKey, privateKey } : null;
}

/**
 * Sends "Rest over" at the end of a rest. A phone can't do this itself: iOS
 * freezes a web app in the background, so its own timer stops.
 *
 * The row is checked again when the rest ends. Skipping or changing the rest
 * replaces or removes it, so an outdated alert finds nothing and is not sent.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NOT_SIGNED_IN();

  const parsed = scheduleRestAlertSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return BAD_REQUEST();
  const { subscription, endsAt, label } = parsed.data;

  const vapid = vapidDetails();
  if (!vapid) return NextResponse.json({ error: "Push notifications are not configured." }, { status: 503 });

  const supabase = await createClient();
  const wait = endsAt - Date.now();
  if (wait <= 0 || wait > MAX_REST_PUSH_MS) {
    await supabase.from("rest_alerts").delete().eq("user_id", user.id).eq("endpoint", subscription.endpoint);
    return NextResponse.json({ scheduled: false });
  }

  const endsAtIso = new Date(endsAt).toISOString();
  const { error } = await supabase.from("rest_alerts").upsert(
    { user_id: user.id, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, ends_at: endsAtIso, label },
    { onConflict: "user_id,endpoint" },
  );
  if (error) return NextResponse.json({ error: "Could not schedule the alert." }, { status: 500 });

  // Only the current token, not the cookies: refreshing the session here, after
  // the response has gone, would leave the browser with a used refresh token.
  const { data: session } = await supabase.auth.getSession();
  const accessToken = session.session?.access_token;
  if (!accessToken) return NOT_SIGNED_IN();

  after(async () => {
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, endsAt - Date.now()) + REST_PUSH_GRACE_MS));

    const client = createSupabaseClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Removing the row claims it, so a repeated request can't send twice.
    const { data: alert, error: claimError } = await client
      .from("rest_alerts")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", subscription.endpoint)
      .eq("ends_at", endsAtIso)
      .select("endpoint, p256dh, auth, label")
      .maybeSingle();
    if (claimError) console.error("Rest alert: could not read the alert:", claimError.message);
    if (!alert) return;

    await webpush
      .sendNotification({ endpoint: alert.endpoint, keys: { p256dh: alert.p256dh, auth: alert.auth } }, restAlertPayload(alert.label), {
        vapidDetails: vapid,
        TTL: 60,
        urgency: "high",
      })
      .catch((sendError: Error & { statusCode?: number }) => console.error("Rest alert: push failed:", sendError.statusCode ?? sendError.message));
  });

  return NextResponse.json({ scheduled: true }, { status: 202 });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NOT_SIGNED_IN();

  const parsed = cancelRestAlertSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return BAD_REQUEST();

  const supabase = await createClient();
  const { error } = await supabase.from("rest_alerts").delete().eq("user_id", user.id).eq("endpoint", parsed.data.endpoint);
  if (error) return NextResponse.json({ error: "Could not cancel the alert." }, { status: 500 });
  return NextResponse.json({ scheduled: false });
}

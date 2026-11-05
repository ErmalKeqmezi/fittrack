import { after, NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/features/auth/queries";
import { cancelRestAlertSchema, MAX_REST_PUSH_MS, scheduleRestAlertSchema } from "@/features/workouts/rest-alert-request";
import { deliverRestAlert, type RestAlertJob } from "@/features/workouts/send-rest-alert";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const NOT_SIGNED_IN = () => NextResponse.json({ error: "Not signed in." }, { status: 401 });
const BAD_REQUEST = () => NextResponse.json({ error: "Invalid request." }, { status: 400 });

/** Hands the wait to a Netlify background function. Elsewhere, as in local development, it runs here. */
async function startDelivery(job: RestAlertJob) {
  const site = process.env.URL;
  if (!site) {
    after(() => deliverRestAlert(job));
    return true;
  }
  const response = await fetch(`${site}/.netlify/functions/rest-alert`, { method: "POST", body: JSON.stringify(job) });
  return response.ok;
}

/**
 * Schedules "Rest over" for the end of a rest. A phone can't do this itself:
 * iOS freezes a web app in the background, so its own timer stops.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NOT_SIGNED_IN();

  const parsed = scheduleRestAlertSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return BAD_REQUEST();
  const { subscription, endsAt, label } = parsed.data;

  if (!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return NextResponse.json({ error: "Push notifications are not configured." }, { status: 503 });

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

  // Only the current token, not the cookies: refreshing the session later, after
  // the response has gone, would leave the browser with a used refresh token.
  const { data: session } = await supabase.auth.getSession();
  const accessToken = session.session?.access_token;
  if (!accessToken) return NOT_SIGNED_IN();

  const started = await startDelivery({ accessToken, userId: user.id, endpoint: subscription.endpoint, endsAt }).catch(() => false);
  if (!started) return NextResponse.json({ error: "Could not schedule the alert." }, { status: 502 });

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

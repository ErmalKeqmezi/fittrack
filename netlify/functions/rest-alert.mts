import type { Config } from "@netlify/functions";

import { deliverRestAlert } from "../../src/features/workouts/send-rest-alert";

/**
 * Waits for a rest to end, then sends the push notification. It's a background
 * function because a normal one is stopped after 60 seconds, shorter than most
 * rests; this kind can run for 15 minutes. /api/rest-alert starts it.
 */
async function handler(request: Request) {
  const job = await request.json().catch(() => null);
  const valid =
    typeof job?.accessToken === "string" && typeof job?.userId === "string" && typeof job?.endpoint === "string" && Number.isInteger(job?.endsAt);
  if (valid) await deliverRestAlert(job);
}

export default handler;

export const config: Config = { background: true };

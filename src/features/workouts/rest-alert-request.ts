import { z } from "zod";

/**
 * A Netlify background function can run for 15 minutes, and it needs a moment to
 * send, so longer rests get no push alert.
 */
export const MAX_REST_PUSH_MS = 14 * 60_000;

/** Lets an open app cancel the alert first, so it doesn't notify about what's on screen. */
export const REST_PUSH_GRACE_MS = 1_000;

/**
 * The server sends a request to this address, so only real browser push
 * services are allowed. Otherwise it could be pointed at any URL.
 */
const PUSH_HOSTS = [/^web\.push\.apple\.com$/, /^fcm\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/];

export function isPushEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && PUSH_HOSTS.some((host) => host.test(url.hostname));
  } catch {
    return false;
  }
}

const endpoint = z.string().max(2048).refine(isPushEndpoint, "Not a push service address.");

export const scheduleRestAlertSchema = z.object({
  subscription: z.object({
    endpoint,
    keys: z.object({ p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(256) }),
  }),
  endsAt: z.number().int().positive(),
  label: z.string().max(200),
});

export const cancelRestAlertSchema = z.object({ endpoint });

export function restAlertPayload(label: string) {
  return JSON.stringify({ title: "Rest over", body: label ? `Time for your next set · ${label}` : "Time for your next set" });
}

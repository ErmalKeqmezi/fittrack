"use client";

/**
 * Push alerts for the rest timer. On iPhone this needs FitTrack on the Home
 * Screen (iOS 16.4 or later). Failures are ignored: the sound and on-screen
 * message still work whenever the app is open.
 */

import { env } from "@/lib/env";

import { getRestAlertPrefs } from "./rest-alert";

const ROUTE = "/api/rest-alert";

function toKeyBytes(base64Url: string) {
  const binary = atob(base64Url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(base64Url.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function getSubscription(createIfMissing: boolean) {
  const key = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key || !("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  const existing = await registration.pushManager.getSubscription();
  if (existing || !createIfMissing) return existing;
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKeyBytes(key) });
}

function send(method: "POST" | "DELETE", body: unknown) {
  // keepalive: the phone may be locked straight after tapping.
  return fetch(ROUTE, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true });
}

// One at a time, in order, so a quick skip can't overtake the request it cancels.
let queue: Promise<unknown> = Promise.resolve();
/** The end of the rest the server will alert about, if any. */
let scheduledFor: number | null = null;

function enqueue(task: () => Promise<unknown>) {
  queue = queue.then(task).catch(() => undefined);
}

/** With a push on its way, a notification from the page would be a duplicate: iOS shows both. */
export function isRestPushScheduled() {
  return scheduledFor !== null;
}

export function scheduleRestPush(endsAt: number, label: string) {
  if (scheduledFor === endsAt) return;
  if (!getRestAlertPrefs().notify || typeof Notification === "undefined" || Notification.permission !== "granted") return;
  scheduledFor = endsAt;
  const giveUp = () => {
    if (scheduledFor === endsAt) scheduledFor = null;
  };
  enqueue(async () => {
    try {
      const subscription = await getSubscription(true);
      const response = subscription ? await send("POST", { subscription: subscription.toJSON(), endsAt, label }) : null;
      if (response?.status !== 202) giveUp();
    } catch {
      giveUp();
    }
  });
}

/** Does nothing unless an alert was scheduled from this page. */
export function cancelRestPush() {
  if (scheduledFor === null) return;
  scheduledFor = null;
  enqueue(async () => {
    const subscription = await getSubscription(false);
    if (subscription) await send("DELETE", { endpoint: subscription.endpoint });
  });
}

/** Cancelled this long before the rest ends if the app is open, so the cancel can't arrive too late. */
export const REST_PUSH_CANCEL_BEFORE_MS = 5_000;

/**
 * Keeps the alert in step with what the phone is doing. It's scheduled when the
 * rest starts, because the phone may be locked right after. Near the end it's
 * only kept if the app isn't on screen; leaving in those last seconds schedules it again.
 */
export function syncRestPush(endsAt: number, label: string, visible: boolean, now = Date.now()) {
  if (now >= endsAt) return;
  if (visible && endsAt - now <= REST_PUSH_CANCEL_BEFORE_MS) cancelRestPush();
  else scheduleRestPush(endsAt, label);
}

/** Call right after notification permission is granted. */
export async function enableRestPush() {
  await getSubscription(true);
}

export async function disableRestPush() {
  cancelRestPush();
  await queue;
  const subscription = await getSubscription(false);
  await subscription?.unsubscribe();
}

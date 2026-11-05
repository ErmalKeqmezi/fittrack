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
let scheduled = false;

function enqueue(task: () => Promise<unknown>) {
  queue = queue.then(task).catch(() => undefined);
}

export function scheduleRestPush(endsAt: number, label: string) {
  if (!getRestAlertPrefs().notify || typeof Notification === "undefined" || Notification.permission !== "granted") return;
  scheduled = true;
  enqueue(async () => {
    const subscription = await getSubscription(true);
    if (!subscription) return;
    await send("POST", { subscription: subscription.toJSON(), endsAt, label });
  });
}

/** Does nothing unless an alert was scheduled from this page. */
export function cancelRestPush() {
  if (!scheduled) return;
  scheduled = false;
  enqueue(async () => {
    const subscription = await getSubscription(false);
    if (subscription) await send("DELETE", { endpoint: subscription.endpoint });
  });
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

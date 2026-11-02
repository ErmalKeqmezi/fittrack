"use client";

import { useEffect } from "react";

/** Registers /sw.js in production builds only (it would fight dev hot reloading). */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Not fatal: the app works without offline support.
    });
  }, []);
  return null;
}

/** Removes cached pages on sign-out so nothing personal stays in the browser cache. */
export async function clearOfflineCaches() {
  try {
    navigator.serviceWorker?.controller?.postMessage("fittrack:clear-caches");
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("fittrack-")).map((k) => caches.delete(k)));
    }
  } catch {
    // Best effort.
  }
}

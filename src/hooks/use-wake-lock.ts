"use client";

import { useEffect } from "react";

/**
 * Keeps the screen on while `active`. Browsers drop the lock when the page is
 * hidden, so it is requested again on return. Silently does nothing where the
 * Screen Wake Lock API is unavailable.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire() {
      try {
        const next = await navigator.wakeLock.request("screen");
        if (cancelled) void next.release();
        else lock = next;
      } catch {
        // Denied (for example on low battery): the timer still runs.
      }
    }
    function onVisibility() {
      if (document.visibilityState === "visible") void acquire();
    }

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
}

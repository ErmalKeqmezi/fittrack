"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { saveWorkout } from "./actions";
import { clearDraft, writeDraft } from "./drafts";
import { toSnapshot } from "./tracker-state";
import type { TrackerState } from "./types";

export type SyncStatus = "saved" | "pending" | "saving" | "offline" | "error";

const SAVE_DELAY_MS = 1200;
const RETRY_DELAY_MS = 8000;
/** Draft writes are batched while typing and flushed when the app is hidden or closed. */
const DRAFT_DELAY_MS = 300;

/**
 * Keeps an in-progress workout safe: writes an on-device draft on every
 * change and autosaves a snapshot to the server after a short pause,
 * retrying while offline. Snapshots are idempotent, so retries are safe.
 */
export function useTrackerSync(state: TrackerState, { enabled }: { enabled: boolean }) {
  const [status, setStatus] = useState<SyncStatus>("saved");
  const [message, setMessage] = useState<string | null>(null);
  const latest = useRef(state);
  const lastSavedJson = useRef(JSON.stringify(toSnapshot(state)));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paused = useRef(false);
  const draftDiscarded = useRef(false);

  const flushDraft = useCallback(() => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = null;
    if (!draftDiscarded.current) writeDraft(latest.current);
  }, []);
  const inFlight = useRef<Promise<boolean> | null>(null);

  const save = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) await inFlight.current;
    if (paused.current) return true;
    const snapshot = toSnapshot(latest.current);
    const json = JSON.stringify(snapshot);
    if (json === lastSavedJson.current) {
      setStatus("saved");
      return true;
    }
    setStatus("saving");
    const run = (async () => {
      try {
        const result = await saveWorkout(snapshot);
        if (result.ok) {
          lastSavedJson.current = json;
          setMessage(null);
          setStatus(JSON.stringify(toSnapshot(latest.current)) === json ? "saved" : "pending");
          return true;
        }
        setMessage(result.message);
        setStatus(result.retryable ? "offline" : "error");
        return false;
      } catch {
        setStatus("offline");
        setMessage("No connection. Saved on this device; will sync when back online.");
        return false;
      }
    })();
    inFlight.current = run;
    const ok = await run;
    inFlight.current = null;
    return ok;
  }, []);

  const schedule = useCallback(
    (delay: number) => {
      const run = (wait: number) => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          void save().then((ok) => {
            if (!ok) run(RETRY_DELAY_MS);
            else if (JSON.stringify(toSnapshot(latest.current)) !== lastSavedJson.current) run(SAVE_DELAY_MS);
          });
        }, wait);
      };
      run(delay);
    },
    [save],
  );

  // Every change: on-device draft shortly after (batched while typing), server
  // save after a pause. The snapshot comparison runs in the save, not per key.
  useEffect(() => {
    latest.current = state;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      flushDraft();
      if (enabled) setStatus((s) => (s === "offline" || s === "error" || s === "saving" ? s : "pending"));
    }, DRAFT_DELAY_MS);
    if (!enabled) return;
    schedule(SAVE_DELAY_MS);
  }, [state, enabled, schedule, flushDraft]);

  // Never lose the last keystrokes: write the draft when hidden, closed or unmounted.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushDraft();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushDraft);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushDraft);
      flushDraft();
    };
  }, [flushDraft]);

  // Sync as soon as the connection or the tab comes back.
  useEffect(() => {
    if (!enabled) return;
    const flushSoon = () => schedule(0);
    const onHide = () => {
      if (document.visibilityState === "hidden") schedule(0);
    };
    window.addEventListener("online", flushSoon);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("online", flushSoon);
      document.removeEventListener("visibilitychange", onHide);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [enabled, schedule]);

  /** Saves now; resolves true when the server has the latest snapshot. */
  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    return save();
  }, [save]);

  /** Stops autosaving while the workout is being finished, so no late save follows it. */
  const pause = useCallback(async () => {
    paused.current = true;
    if (timer.current) clearTimeout(timer.current);
    if (inFlight.current) await inFlight.current;
  }, []);

  /** Saves again, on the device too, after finishing or discarding failed. */
  const resume = useCallback(() => {
    paused.current = false;
    draftDiscarded.current = false;
    schedule(0);
  }, [schedule]);

  /** Removes the on-device draft for good, including the write on leaving the page. */
  const discardDraft = useCallback(() => {
    draftDiscarded.current = true;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    clearDraft(latest.current.sessionId);
  }, []);

  return { status, message, flush, pause, resume, discardDraft };
}

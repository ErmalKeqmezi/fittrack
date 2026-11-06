"use client";

import { Timer, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useWakeLock } from "@/hooks/use-wake-lock";

import { fireRestAlert, unlockRestAudio } from "../rest-alert";
import { cancelRestPush, isRestPushScheduled, REST_PUSH_CANCEL_BEFORE_MS, syncRestPush } from "../rest-push";
import type { RestTimer as RestTimerState } from "../types";

function format(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Floating countdown after each completed working set. */
export function RestTimer({
  timer,
  onAdjust,
  onStop,
}: {
  timer: RestTimerState | null;
  onAdjust: (seconds: number) => void;
  onStop: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const notifiedFor = useRef<number | null>(null);
  useWakeLock(timer !== null);

  // Browsers only allow sound after a tap, so get it ready on any tap in the tracker.
  useEffect(() => {
    document.addEventListener("touchend", unlockRestAudio, { capture: true, passive: true });
    document.addEventListener("click", unlockRestAudio, { capture: true, passive: true });
    return () => {
      document.removeEventListener("touchend", unlockRestAudio, { capture: true });
      document.removeEventListener("click", unlockRestAudio, { capture: true });
    };
  }, []);

  // The server alerts the phone only if the app isn't on screen when the rest ends.
  const endsAt = timer?.endsAt ?? null;
  const label = timer?.label ?? "";
  useEffect(() => {
    if (endsAt === null) {
      cancelRestPush();
      return;
    }
    const sync = () => syncRestPush(endsAt, label, document.visibilityState === "visible");
    sync();
    const nearEnd = setTimeout(sync, Math.max(0, endsAt - Date.now() - REST_PUSH_CANCEL_BEFORE_MS));
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearTimeout(nearEnd);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [endsAt, label]);

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer]);

  const remaining = timer ? (timer.endsAt - now) / 1000 : 0;

  useEffect(() => {
    if (!timer || remaining > 0 || notifiedFor.current === timer.endsAt) return;
    notifiedFor.current = timer.endsAt;
    fireRestAlert(timer.label, { allowNotification: !isRestPushScheduled() });
    toast("Rest over. Time for the next set.", { duration: 4000 });
    onStop();
  }, [timer, remaining, onStop]);

  if (!timer || remaining <= 0) return null;
  const progress = Math.min(1, Math.max(0, 1 - remaining / timer.totalSeconds));

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`Rest timer, ${format(remaining)} remaining`}
      className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md overflow-hidden rounded-2xl border border-primary/40 bg-popover shadow-2xl shadow-black/50 lg:right-8 lg:bottom-8 lg:left-auto lg:w-96"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <Timer className="size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{format(remaining)}</p>
          <p className="truncate text-xs text-muted-foreground">Rest · {timer.label}</p>
        </div>
        <Button variant="outline" className="h-11 w-12 rounded-xl tabular-nums" onClick={() => onAdjust(-15)} aria-label="15 seconds less">
          −15
        </Button>
        <Button variant="outline" className="h-11 w-12 rounded-xl tabular-nums" onClick={() => onAdjust(15)} aria-label="15 seconds more">
          +15
        </Button>
        <Button variant="ghost" className="size-11 rounded-xl" onClick={onStop} aria-label="Skip rest">
          <X aria-hidden />
        </Button>
      </div>
      <div className="h-1 bg-secondary">
        <div
          className="h-full origin-left bg-primary transition-transform duration-300 ease-linear will-change-transform"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
}

"use client";

import { BellRing } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { getSubscription } from "@/features/workouts/rest-push";
import { offline } from "@/lib/offline";

import { savePushSubscription, saveReminderSettings } from "../actions";

/** Registers this device for reminders. Returns a message when it can't. */
async function registerDevice(askPermission: boolean): Promise<string | null> {
  if (typeof Notification === "undefined") return "This browser can't show notifications. On iPhone, add FitTrack to your Home Screen first.";
  const permission = askPermission ? await Notification.requestPermission() : Notification.permission;
  if (permission !== "granted") return "Notifications are blocked. Allow them for FitTrack in your browser or phone settings.";
  try {
    const subscription = await getSubscription(true);
    if (!subscription) return "Notifications aren't available on this device.";
    const result = await savePushSubscription(subscription.toJSON()).catch(offline);
    return result.ok ? null : result.message;
  } catch {
    return "Couldn't connect this device to notifications. Try again later.";
  }
}

/** A daily "don't forget to work out" notification at a time the user picks. */
export function WorkoutReminderSettings({ initialEnabled, initialTime }: { initialEnabled: boolean; initialTime: string }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [time, setTime] = useState(initialTime);
  // What the server has, so a picked time is saved once and only when it changed.
  const [savedTime, setSavedTime] = useState(initialTime);
  const [warning, setWarning] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // A device opened later (a new phone, a reinstall) joins in once permission is already given.
  useEffect(() => {
    if (initialEnabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
      void registerDevice(false);
    }
  }, [initialEnabled]);

  // Saves a newly picked time after a short pause, so typing "07:15" saves once.
  useEffect(() => {
    if (!enabled || time === savedTime || !/^\d{2}:\d{2}$/.test(time)) return;
    const timer = setTimeout(() => save(true, time, false), 700);
    return () => clearTimeout(timer);
    // save is recreated each render; the values it needs are listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, time, savedTime]);

  function save(nextEnabled: boolean, nextTime: string, askPermission: boolean) {
    const before = { enabled, time: savedTime };
    setEnabled(nextEnabled);
    setTime(nextTime);
    setSavedTime(nextTime);
    startTransition(async () => {
      if (nextEnabled && askPermission) setWarning(await registerDevice(true));
      if (!nextEnabled) setWarning(null);
      const result = await saveReminderSettings(nextEnabled, nextTime).catch(offline);
      if (!result.ok) {
        setEnabled(before.enabled);
        setTime(before.time);
        setSavedTime(before.time);
        toast.error(result.message);
        return;
      }
      toast.success(result.message ?? "Saved.");
    });
  }

  return (
    <div className="grid gap-3">
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          disabled={pending}
          onChange={(e) => save(e.target.checked, time, e.target.checked)}
          className="size-5 shrink-0 accent-primary"
        />
        <BellRing className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium">Daily workout reminder</span>
      </label>

      {enabled ? (
        <label className="flex flex-wrap items-center gap-3 pl-8 text-sm">
          <span className="text-muted-foreground">Remind me at</span>
          <input
            type="time"
            value={time}
            required
            onChange={(e) => setTime(e.target.value)}
            aria-label="Reminder time"
            className="h-11 rounded-xl border border-input bg-input/30 px-3 text-base tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
          />
        </label>
      ) : null}

      {warning ? <p className="text-sm text-destructive">{warning}</p> : null}
      <p className="text-xs text-muted-foreground">
        A notification saying &ldquo;don&apos;t forget to work out today&rdquo; at your time, in your timezone from Profile. It&apos;s skipped on days
        you&apos;ve already started a workout, and arrives within about 5 minutes of the time you pick. On iPhone it needs FitTrack on your Home
        Screen.
      </p>
    </div>
  );
}

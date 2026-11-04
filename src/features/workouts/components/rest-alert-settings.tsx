"use client";

import { Bell, Volume2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

import {
  DEFAULT_PREFS,
  getRestAlertPrefs,
  notificationSupport,
  playRestSound,
  requestRestNotifications,
  setRestAlertPrefs,
  subscribeRestAlertPrefs,
  unlockRestAudio,
} from "../rest-alert";

export function RestAlertSettings() {
  const prefs = useSyncExternalStore(subscribeRestAlertPrefs, getRestAlertPrefs, () => DEFAULT_PREFS);
  const [message, setMessage] = useState<string | null>(null);

  async function toggleNotifications(enabled: boolean) {
    setMessage(null);
    if (!enabled) {
      setRestAlertPrefs({ notify: false });
      return;
    }
    const permission = await requestRestNotifications();
    if (permission === "granted") {
      setRestAlertPrefs({ notify: true });
    } else if (permission === "unsupported") {
      setMessage("This browser can't show notifications. On iPhone, add FitTrack to your Home Screen first.");
    } else {
      setMessage("Notifications are blocked. Allow them for FitTrack in your browser or phone settings.");
    }
  }

  // A permission withdrawn in the browser settings overrides the saved choice.
  const notifyOn = prefs.notify && typeof window !== "undefined" && notificationSupport() === "granted";

  return (
    <div className="grid gap-3">
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={prefs.sound}
          onChange={(e) => setRestAlertPrefs({ sound: e.target.checked })}
          className="size-5 accent-primary"
        />
        <Volume2 className="size-4 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 text-sm font-medium">Sound when rest ends</span>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl px-3"
          onClick={(e) => {
            e.preventDefault();
            unlockRestAudio();
            playRestSound();
          }}
        >
          Test
        </Button>
      </label>
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={notifyOn}
          onChange={(e) => void toggleNotifications(e.target.checked)}
          className="size-5 accent-primary"
        />
        <Bell className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium">Notification when FitTrack is in the background</span>
      </label>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <p className="text-xs text-muted-foreground">
        The screen stays on during rest so the timer keeps running. Phones pause apps once they lock, so an alert may only
        arrive when you unlock. On iPhone, the silent switch also mutes the sound.
      </p>
    </div>
  );
}

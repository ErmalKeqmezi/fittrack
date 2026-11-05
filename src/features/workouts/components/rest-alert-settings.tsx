"use client";

import { Bell, BellRing, Check, Volume2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

import {
  canIgnoreSilentSwitch,
  DEFAULT_PREFS,
  getRestAlertPrefs,
  notificationSupport,
  playRestSound,
  requestRestNotifications,
  setRestAlertPrefs,
  subscribeRestAlertPrefs,
  unlockRestAudio,
} from "../rest-alert";
import { disableRestPush, enableRestPush } from "../rest-push";
import { REST_TONE_LABELS, REST_TONES, type RestTone } from "../rest-tones";

export function RestAlertSettings() {
  const prefs = useSyncExternalStore(subscribeRestAlertPrefs, getRestAlertPrefs, () => DEFAULT_PREFS);
  const [message, setMessage] = useState<string | null>(null);

  function chooseTone(tone: RestTone) {
    setRestAlertPrefs({ tone });
    unlockRestAudio();
    playRestSound(tone);
  }

  async function toggleNotifications(enabled: boolean) {
    setMessage(null);
    if (!enabled) {
      setRestAlertPrefs({ notify: false });
      void disableRestPush().catch(() => undefined);
      return;
    }
    const permission = await requestRestNotifications();
    if (permission === "granted") {
      setRestAlertPrefs({ notify: true });
      try {
        await enableRestPush();
      } catch {
        setMessage("Couldn't connect to notifications on this device, so you may only get an alert while FitTrack is open.");
      }
    } else if (permission === "unsupported") {
      setMessage("This browser can't show notifications. On iPhone, add FitTrack to your Home Screen first.");
    } else {
      setMessage("Notifications are blocked. Allow them for FitTrack in your browser or phone settings.");
    }
  }

  // A permission withdrawn in the browser settings overrides the saved choice.
  const notifyOn = prefs.notify && typeof window !== "undefined" && notificationSupport() === "granted";
  const showSilentOption = prefs.sound && typeof window !== "undefined" && canIgnoreSilentSwitch();

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
        <span className="text-sm font-medium">Sound when rest ends</span>
      </label>
      {prefs.sound ? (
        <div role="radiogroup" aria-label="Rest timer sound" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {REST_TONES.map((tone) => (
            <button
              key={tone}
              type="button"
              role="radio"
              aria-checked={prefs.tone === tone}
              onClick={() => chooseTone(tone)}
              className={cn(
                "flex h-11 items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                prefs.tone === tone
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground hover:text-foreground active:bg-secondary",
              )}
            >
              {prefs.tone === tone ? <Check className="size-4 text-primary" aria-hidden /> : null}
              {REST_TONE_LABELS[tone]}
            </button>
          ))}
        </div>
      ) : null}
      {prefs.sound ? <p className="text-xs text-muted-foreground">Tap a sound to hear it. It&apos;s saved right away.</p> : null}
      {showSilentOption ? (
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={prefs.ignoreSilent}
            onChange={(e) => setRestAlertPrefs({ ignoreSilent: e.target.checked })}
            className="size-5 shrink-0 accent-primary"
          />
          <BellRing className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="text-sm font-medium">
            Play even when the iPhone is on silent
            <span className="block text-xs font-normal text-muted-foreground">Other audio, like your music, may stop when the sound plays.</span>
          </span>
        </label>
      ) : null}
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={notifyOn}
          onChange={(e) => void toggleNotifications(e.target.checked)}
          className="size-5 accent-primary"
        />
        <Bell className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium">Notification when FitTrack is in the background or the phone is locked</span>
      </label>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <p className="text-xs text-muted-foreground">
        The screen stays on during rest so the timer keeps running. The chosen sound only plays while FitTrack is open;
        in the background you get a notification with the phone&apos;s own sound, for rests up to about 4½ minutes. On iPhone,
        notifications need FitTrack on your Home Screen.
      </p>
    </div>
  );
}

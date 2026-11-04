"use client";

/**
 * How the rest timer gets your attention. Preferences are per device, so they
 * live in localStorage rather than the database.
 */

import { DEFAULT_REST_TONE, isRestTone, REST_TONE_NOTES, type RestTone } from "./rest-tones";

const STORAGE_KEY = "fittrack:rest-alert";

export type RestAlertPrefs = { sound: boolean; notify: boolean; tone: RestTone };

export const DEFAULT_PREFS: RestAlertPrefs = { sound: true, notify: false, tone: DEFAULT_REST_TONE };

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedPrefs: RestAlertPrefs = DEFAULT_PREFS;

export function subscribeRestAlertPrefs(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getRestAlertPrefs(): RestAlertPrefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      const saved = raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<RestAlertPrefs>) } : DEFAULT_PREFS;
      // A tone removed in a later version falls back to the default.
      cachedPrefs = isRestTone(saved.tone) ? saved : { ...saved, tone: DEFAULT_REST_TONE };
    }
  } catch {
    cachedPrefs = DEFAULT_PREFS;
  }
  return cachedPrefs;
}

export function setRestAlertPrefs(patch: Partial<RestAlertPrefs>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...getRestAlertPrefs(), ...patch }));
  } catch {
    // Storage unavailable: the defaults apply.
  }
  listeners.forEach((listener) => listener());
}

// --- Sound -------------------------------------------------------------------

let audio: AudioContext | null = null;

/** Browsers only allow audio after a tap, so the tracker calls this on every tap. */
export function unlockRestAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    // No Web Audio: the vibration and on-screen message still apply.
  }
}

let playing: OscillatorNode[] = [];

/** Plays a tone, cutting off any tone still sounding so previews don't overlap. */
export function playRestSound(tone: RestTone = getRestAlertPrefs().tone) {
  if (!audio) unlockRestAudio();
  if (!audio) return;
  for (const oscillator of playing) {
    try {
      oscillator.stop();
    } catch {
      // Already finished.
    }
  }
  const start = audio.currentTime + 0.02;
  playing = REST_TONE_NOTES[tone].map((note) => {
    const at = start + note.at;
    const oscillator = audio!.createOscillator();
    const gain = audio!.createGain();
    oscillator.type = note.wave;
    oscillator.frequency.value = note.frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(note.gain, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + note.duration);
    oscillator.connect(gain).connect(audio!.destination);
    oscillator.start(at);
    oscillator.stop(at + note.duration + 0.02);
    return oscillator;
  });
}

// --- Notification ------------------------------------------------------------

export type NotificationSupport = "unsupported" | NotificationPermission;

export function notificationSupport(): NotificationSupport {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

export async function requestRestNotifications(): Promise<NotificationSupport> {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.requestPermission();
}

async function showNotification(label: string) {
  const title = "Rest over";
  const options = { body: `Time for your next set · ${label}`, tag: "fittrack-rest", icon: "/icons/icon-192.png" };
  const registration = await navigator.serviceWorker?.getRegistration();
  // Installed apps on phones can only notify through the service worker.
  if (registration) await registration.showNotification(title, options);
  else new Notification(title, options);
}

/** Everything that happens when a rest ends. Each channel is independent and optional. */
export function fireRestAlert(label: string) {
  const prefs = getRestAlertPrefs();
  if (prefs.sound) {
    try {
      playRestSound();
    } catch {
      // Ignore: other channels still run.
    }
  }
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // Vibration is optional.
  }
  if (prefs.notify && document.visibilityState === "hidden" && notificationSupport() === "granted") {
    void showNotification(label).catch(() => undefined);
  }
}

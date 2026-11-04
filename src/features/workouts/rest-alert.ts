"use client";

/**
 * How the rest timer gets your attention. Preferences are per device, so they
 * live in localStorage rather than the database.
 */

const STORAGE_KEY = "fittrack:rest-alert";

export type RestAlertPrefs = { sound: boolean; notify: boolean };

export const DEFAULT_PREFS: RestAlertPrefs = { sound: true, notify: false };

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
      cachedPrefs = raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<RestAlertPrefs>) } : DEFAULT_PREFS;
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

export function playRestSound() {
  if (!audio) unlockRestAudio();
  if (!audio) return;
  const start = audio.currentTime + 0.02;
  for (let i = 0; i < 3; i++) {
    const at = start + i * 0.28;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = i === 2 ? 1175 : 880;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.6, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.24);
  }
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

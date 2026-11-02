/** ISO weekdays: 1 = Monday … 7 = Sunday (matches workout_days.weekday). */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

// Mirrors the limits enforced in supabase/migrations/*_planner.sql.
export const MAX_DAYS_PER_PLAN = 14;
export const MAX_EXERCISES_PER_DAY = 20;

export const REST_PRESETS = [60, 90, 120, 150, 180, 240] as const;

export function formatRest(seconds: number | null) {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? (s ? `${m}:${String(s).padStart(2, "0")} min` : `${m} min`) : `${s} s`;
}

export function formatTargets(sets: number, repsMin: number, repsMax: number) {
  return `${sets} × ${repsMin === repsMax ? repsMin : `${repsMin}–${repsMax}`}`;
}

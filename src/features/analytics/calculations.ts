import { addDays, addMonths, daysBetween, startOfMonth, startOfWeek, toDateKey, type DateKey } from "@/lib/dates";

/**
 * Pure training-statistics functions. They only aggregate recorded data;
 * nothing here invents or interpolates values.
 */

export type SessionSummary = {
  id: string;
  name: string;
  startedAt: string;
  endedAt: string | null;
  exerciseCount: number;
  workingSetCount: number;
  volumeKg: number;
};

/**
 * Estimated one-rep max (Epley). Mirrors public.estimate_1rm in SQL:
 * only sets of 1–12 reps with a positive load produce an estimate.
 */
export function estimateOneRepMax(weightKg: number, reps: number): number | null {
  if (!(weightKg > 0) || !Number.isInteger(reps) || reps < 1 || reps > 12) return null;
  if (reps === 1) return round2(weightKg);
  return round2(weightKg * (1 + reps / 30));
}

export function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function totalVolume(sessions: Pick<SessionSummary, "volumeKg">[]) {
  return round2(sessions.reduce((sum, s) => sum + s.volumeKg, 0));
}

export function sessionDurationMinutes(session: Pick<SessionSummary, "startedAt" | "endedAt">) {
  if (!session.endedAt) return null;
  const ms = new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime();
  return ms >= 0 ? Math.round(ms / 60_000) : null;
}

export type WeekBucket = {
  weekStart: DateKey;
  workouts: number;
  volumeKg: number;
};

/** Groups sessions into the last `weeks` ISO weeks (oldest first), including empty weeks. */
export function weeklyBuckets(
  sessions: Pick<SessionSummary, "startedAt" | "volumeKg">[],
  today: DateKey,
  timeZone: string,
  weeks: number,
): WeekBucket[] {
  const currentWeek = startOfWeek(today);
  const buckets = Array.from({ length: weeks }, (_, i) => ({
    weekStart: addDays(currentWeek, (i - weeks + 1) * 7),
    workouts: 0,
    volumeKg: 0,
  }));
  const byStart = new Map(buckets.map((b) => [b.weekStart, b]));

  for (const session of sessions) {
    const bucket = byStart.get(startOfWeek(toDateKey(session.startedAt, timeZone)));
    if (bucket) {
      bucket.workouts += 1;
      bucket.volumeKg = round2(bucket.volumeKg + session.volumeKg);
    }
  }
  return buckets;
}

export type WeekDay = { date: DateKey; workouts: number; isToday: boolean; isFuture: boolean };

/** Monday–Sunday of the current week with the number of workouts on each day. */
export function currentWeekDays(
  sessions: Pick<SessionSummary, "startedAt">[],
  today: DateKey,
  timeZone: string,
): WeekDay[] {
  const monday = startOfWeek(today);
  const counts = new Map<DateKey, number>();
  for (const session of sessions) {
    const key = toDateKey(session.startedAt, timeZone);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    return { date, workouts: counts.get(date) ?? 0, isToday: date === today, isFuture: date > today };
  });
}

export type ExerciseSessionBest = {
  exerciseId: string;
  exerciseName: string;
  startedAt: string;
  topWeightKg: number;
  topWeightReps: number;
  bestE1rmKg: number | null;
};

export type ProgressionHighlight = {
  exerciseId: string;
  exerciseName: string;
  latest: ExerciseSessionBest;
  previous: ExerciseSessionBest;
  /** Change in actual top-set weight (recorded). */
  topWeightChangeKg: number;
  /** Change in estimated 1RM; null when either session has no estimable set. */
  e1rmChangeKg: number | null;
};

/**
 * For each exercise trained within `windowDays` of today, compares its latest
 * session against the session before it. Requires two recorded sessions;
 * exercises with only one are skipped rather than guessed.
 * Input must be sorted by startedAt descending.
 */
export function progressionHighlights(
  bestsNewestFirst: ExerciseSessionBest[],
  today: DateKey,
  timeZone: string,
  windowDays = 30,
  limit = 4,
): ProgressionHighlight[] {
  const byExercise = new Map<string, ExerciseSessionBest[]>();
  for (const best of bestsNewestFirst) {
    const list = byExercise.get(best.exerciseId) ?? [];
    if (list.length < 2) list.push(best);
    byExercise.set(best.exerciseId, list);
  }

  const highlights: ProgressionHighlight[] = [];
  for (const [exerciseId, [latest, previous]] of byExercise) {
    if (!latest || !previous) continue;
    if (daysBetween(toDateKey(latest.startedAt, timeZone), today) > windowDays) continue;
    highlights.push({
      exerciseId,
      exerciseName: latest.exerciseName,
      latest,
      previous,
      topWeightChangeKg: round2(latest.topWeightKg - previous.topWeightKg),
      e1rmChangeKg:
        latest.bestE1rmKg != null && previous.bestE1rmKg != null
          ? round2(latest.bestE1rmKg - previous.bestE1rmKg)
          : null,
    });
  }

  // Most recent first, then biggest improvement.
  return highlights
    .sort(
      (a, b) =>
        b.latest.startedAt.localeCompare(a.latest.startedAt) ||
        (b.e1rmChangeKg ?? b.topWeightChangeKg) - (a.e1rmChangeKg ?? a.topWeightChangeKg),
    )
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Ranges and period comparisons
// ---------------------------------------------------------------------------

export const RANGES = ["7d", "30d", "3m", "6m", "all"] as const;
export type Range = (typeof RANGES)[number];

export const RANGE_LABELS: Record<Range, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "3m": "3 months",
  "6m": "6 months",
  all: "All time",
};

export function parseRange(value: unknown, fallback: Range = "3m"): Range {
  return typeof value === "string" && (RANGES as readonly string[]).includes(value) ? (value as Range) : fallback;
}

/** First day (inclusive) of the range ending today, or null for all time. */
export function rangeStart(range: Range, today: DateKey): DateKey | null {
  switch (range) {
    case "7d":
      return addDays(today, -6);
    case "30d":
      return addDays(today, -29);
    case "3m":
      return addDays(addMonths(today, -3), 1);
    case "6m":
      return addDays(addMonths(today, -6), 1);
    case "all":
      return null;
  }
}

/** The equally long period just before the range, for "vs previous period". */
export function previousPeriod(range: Range, today: DateKey): { from: DateKey; to: DateKey } | null {
  const from = rangeStart(range, today);
  if (!from) return null;
  const length = daysBetween(from, today) + 1;
  return { from: addDays(from, -length), to: addDays(from, -1) };
}

export function inPeriod(startedAt: string, timeZone: string, from: DateKey | null, to: DateKey) {
  const key = toDateKey(startedAt, timeZone);
  return (!from || key >= from) && key <= to;
}

export type PeriodTotals = { workouts: number; volumeKg: number; workingSets: number; avgDurationMinutes: number | null };

export function periodTotals(sessions: SessionSummary[]): PeriodTotals {
  const durations = sessions.map(sessionDurationMinutes).filter((m): m is number => m !== null);
  return {
    workouts: sessions.length,
    volumeKg: totalVolume(sessions),
    workingSets: sessions.reduce((sum, s) => sum + s.workingSetCount, 0),
    avgDurationMinutes: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
  };
}

/** Relative change in percent; null when there is nothing to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export type MonthBucket = { monthStart: DateKey; workouts: number; volumeKg: number };

/** The last `months` calendar months (oldest first), including empty ones. */
export function monthlyBuckets(
  sessions: Pick<SessionSummary, "startedAt" | "volumeKg">[],
  today: DateKey,
  timeZone: string,
  months: number,
): MonthBucket[] {
  const current = startOfMonth(today);
  const buckets = Array.from({ length: months }, (_, i) => ({
    monthStart: addMonths(current, i - months + 1),
    workouts: 0,
    volumeKg: 0,
  }));
  const byStart = new Map(buckets.map((b) => [b.monthStart, b]));
  for (const session of sessions) {
    const bucket = byStart.get(startOfMonth(toDateKey(session.startedAt, timeZone)));
    if (bucket) {
      bucket.workouts += 1;
      bucket.volumeKg = round2(bucket.volumeKg + session.volumeKg);
    }
  }
  return buckets;
}

// ---------------------------------------------------------------------------
// Per-exercise progression
// ---------------------------------------------------------------------------

export type ExerciseSessionStats = {
  sessionId: string;
  startedAt: string;
  topWeightKg: number;
  topWeightReps: number;
  maxReps: number;
  bestE1rmKg: number | null;
  volumeKg: number;
  workingSets: number;
};

export type ExerciseRangeSummary = {
  sessions: number;
  volumeKg: number;
  /** Actual: heaviest top set in the range. */
  bestTopSet: { weightKg: number; reps: number; startedAt: string } | null;
  /** Estimated: best e1RM in the range. */
  bestE1rmKg: number | null;
  maxReps: number;
  /** First vs last session in the range. */
  topWeightChangeKg: number | null;
  e1rmChangeKg: number | null;
};

/** Summary of an exercise's sessions (oldest first) within a range. */
export function summarizeExercise(points: ExerciseSessionStats[]): ExerciseRangeSummary {
  let best: ExerciseRangeSummary["bestTopSet"] = null;
  let bestE1rm: number | null = null;
  let maxReps = 0;
  for (const p of points) {
    if (!best || p.topWeightKg > best.weightKg || (p.topWeightKg === best.weightKg && p.topWeightReps > best.reps)) {
      best = { weightKg: p.topWeightKg, reps: p.topWeightReps, startedAt: p.startedAt };
    }
    if (p.bestE1rmKg !== null && (bestE1rm === null || p.bestE1rmKg > bestE1rm)) bestE1rm = p.bestE1rmKg;
    maxReps = Math.max(maxReps, p.maxReps);
  }
  const first = points[0];
  const last = points.at(-1);
  const comparable = points.length >= 2 && first && last;
  return {
    sessions: points.length,
    volumeKg: round2(points.reduce((sum, p) => sum + p.volumeKg, 0)),
    bestTopSet: best,
    bestE1rmKg: bestE1rm,
    maxReps,
    topWeightChangeKg: comparable ? round2(last.topWeightKg - first.topWeightKg) : null,
    e1rmChangeKg:
      comparable && first.bestE1rmKg !== null && last.bestE1rmKg !== null ? round2(last.bestE1rmKg - first.bestE1rmKg) : null,
  };
}

// ---------------------------------------------------------------------------
// Muscle group volume
// ---------------------------------------------------------------------------

export type MuscleInfo = { id: number; name: string };
export type ExerciseMuscles = { primary: MuscleInfo; secondary: MuscleInfo[] };

/** A secondary muscle counts as half a set, a common convention for indirect work. */
export const SECONDARY_SET_WEIGHT = 0.5;

export type MuscleVolume = { id: number; name: string; sets: number; setsPerWeek: number };

/** Working sets per muscle group, most trained first. Exercises without muscle data are skipped. */
export function muscleGroupVolume(
  logged: { exerciseId: string; workingSets: number }[],
  muscles: Map<string, ExerciseMuscles>,
  weeks: number,
): MuscleVolume[] {
  const totals = new Map<number, { name: string; sets: number }>();
  const add = (muscle: MuscleInfo, sets: number) => {
    const entry = totals.get(muscle.id) ?? { name: muscle.name, sets: 0 };
    entry.sets += sets;
    totals.set(muscle.id, entry);
  };
  for (const { exerciseId, workingSets } of logged) {
    const info = muscles.get(exerciseId);
    if (!info) continue;
    add(info.primary, workingSets);
    for (const secondary of info.secondary) add(secondary, workingSets * SECONDARY_SET_WEIGHT);
  }
  const divisor = Math.max(weeks, 1);
  return [...totals]
    .map(([id, { name, sets }]) => ({ id, name, sets, setsPerWeek: Math.round((sets / divisor) * 10) / 10 }))
    .sort((a, b) => b.sets - a.sets || a.name.localeCompare(b.name));
}

/** Length of a period in weeks: the range, or from the first workout for all time. */
export function periodWeeks(from: DateKey | null, firstActivity: DateKey | null, today: DateKey) {
  const start = from ?? firstActivity;
  if (!start) return 1;
  return Math.max((daysBetween(start, today) + 1) / 7, 1);
}

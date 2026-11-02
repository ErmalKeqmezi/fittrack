import { addDays, daysBetween, startOfWeek, toDateKey, type DateKey } from "@/lib/dates";

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

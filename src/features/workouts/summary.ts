import { estimateOneRepMax, percentChange, round2, SECONDARY_SET_WEIGHT, sessionDurationMinutes, type ExerciseMuscles } from "@/features/analytics/calculations";

import { parseReps, parseRpe, parseWeight } from "./set-values";
import { matchingPreviousSet } from "./tracker-state";
import type { PreviousPerformance, PreviousSet, TrackerExercise, TrackerState } from "./types";

/**
 * Everything the workout summary shows, calculated only from saved data, so it
 * is the same after a refresh or months later and follows later edits.
 * Volume, sets and reps use completed working sets; warm-ups are listed but excluded.
 */

export type RecordType = "max_weight" | "max_reps" | "best_e1rm";

export type BestSet = { weightKg: number; reps: number };

/** An earlier completed session of one exercise. */
export type PriorBest = { exerciseId: string; topWeightKg: number; maxReps: number; bestE1rmKg: number | null };

/** An earlier completed workout, newest first in the input. */
export type PriorSession = {
  id: string;
  name: string;
  workoutDayId: string | null;
  startedAt: string;
  volumeKg: number;
};

type LoggedSet = { id: string; isWarmup: boolean; weightKg: number; reps: number; rpe: number | null };

function loggedSets(exercise: TrackerExercise): LoggedSet[] {
  return exercise.sets
    .filter((s) => s.done)
    .map((s) => ({
      id: s.id,
      isWarmup: s.isWarmup,
      weightKg: parseWeight(s.weight) ?? 0,
      reps: parseReps(s.reps) ?? 0,
      rpe: parseRpe(s.rpe) ?? null,
    }));
}

type WorkingStats = { setCount: number; reps: number; volumeKg: number; best: BestSet | null; maxReps: number; bestE1rmKg: number | null };

/** Heaviest set; between equal weights, the one with more reps. */
function workingStats(sets: { weightKg: number; reps: number }[]): WorkingStats {
  let best: BestSet | null = null;
  let bestE1rmKg: number | null = null;
  let maxReps = 0;
  let volumeKg = 0;
  let reps = 0;
  for (const set of sets) {
    volumeKg += set.weightKg * set.reps;
    reps += set.reps;
    maxReps = Math.max(maxReps, set.reps);
    if (!best || set.weightKg > best.weightKg || (set.weightKg === best.weightKg && set.reps > best.reps)) {
      best = { weightKg: set.weightKg, reps: set.reps };
    }
    const e1rm = estimateOneRepMax(set.weightKg, set.reps);
    if (e1rm !== null && (bestE1rmKg === null || e1rm > bestE1rmKg)) bestE1rmKg = e1rm;
  }
  return { setCount: sets.length, reps, volumeKg: round2(volumeKg), best, maxReps, bestE1rmKg };
}

const working = <T extends { isWarmup: boolean }>(sets: T[]) => sets.filter((s) => !s.isWarmup);

export type SummaryRecord = {
  exerciseId: string;
  exerciseName: string;
  type: RecordType;
  previousValue: number;
  value: number;
  improvement: number;
  weightKg: number;
  reps: number;
  setId: string;
};

/**
 * Records this workout beat, compared with everything logged before it. As with
 * the finish notification, a first-ever value is not reported as a record.
 * Values follow public.recompute_personal_records: working sets only, weight above 0.
 */
export function findRecords(state: TrackerState, priorBests: PriorBest[]): SummaryRecord[] {
  const records: SummaryRecord[] = [];
  const seen = new Set<string>();

  for (const exercise of state.exercises) {
    if (seen.has(exercise.exerciseId)) continue;
    seen.add(exercise.exerciseId);

    const rows = state.exercises.filter((e) => e.exerciseId === exercise.exerciseId);
    const sets = rows.flatMap((e) => working(loggedSets(e)));
    if (!sets.length) continue;
    const prior = priorBests.filter((p) => p.exerciseId === exercise.exerciseId);

    const consider = (type: RecordType, previous: number | null, pick: (s: LoggedSet) => number | null, tiebreak: (s: LoggedSet) => number) => {
      if (previous === null) return;
      let top: LoggedSet | null = null;
      let value = -Infinity;
      for (const set of sets) {
        const v = pick(set);
        if (v === null) continue;
        if (v > value || (v === value && top && tiebreak(set) > tiebreak(top))) {
          value = v;
          top = set;
        }
      }
      if (top && value > previous) {
        records.push({
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.name,
          type,
          previousValue: previous,
          value,
          improvement: round2(value - previous),
          weightKg: top.weightKg,
          reps: top.reps,
          setId: top.id,
        });
      }
    };

    const maxOf = (values: number[]) => (values.length ? Math.max(...values) : null);
    consider("max_weight", maxOf(prior.map((p) => p.topWeightKg).filter((w) => w > 0)), (s) => (s.weightKg > 0 ? s.weightKg : null), (s) => s.reps);
    consider("max_reps", maxOf(prior.map((p) => p.maxReps).filter((r) => r > 0)), (s) => (s.reps > 0 ? s.reps : null), (s) => s.weightKg);
    consider("best_e1rm", maxOf(prior.map((p) => p.bestE1rmKg).filter((e): e is number => e !== null)), (s) => estimateOneRepMax(s.weightKg, s.reps), () => 0);
  }
  return records;
}

export type SummarySet = {
  id: string;
  label: string;
  isWarmup: boolean;
  weightKg: number;
  reps: number;
  rpe: number | null;
  previous: PreviousSet | null;
  records: RecordType[];
};

export type SummaryExercise = {
  id: string;
  exerciseId: string;
  name: string;
  notes: string;
  sets: SummarySet[];
  setCount: number;
  volumeKg: number;
  best: BestSet | null;
  bestE1rmKg: number | null;
  recordCount: number;
  previous: {
    startedAt: string;
    setCount: number;
    volumeKg: number;
    best: BestSet | null;
    volumeChangeKg: number;
    topWeightChangeKg: number | null;
    e1rmChangeKg: number | null;
  } | null;
};

function buildExercise(exercise: TrackerExercise, previous: PreviousPerformance | undefined, records: SummaryRecord[]): SummaryExercise {
  const sets = loggedSets(exercise);
  const stats = workingStats(working(sets));
  let workingIndex = 0;

  const summarySets: SummarySet[] = sets.map((set, i) => ({
    id: set.id,
    label: set.isWarmup ? "W" : String(++workingIndex),
    isWarmup: set.isWarmup,
    weightKg: set.weightKg,
    reps: set.reps,
    rpe: set.rpe,
    previous: matchingPreviousSet(sets, i, previous) ?? null,
    records: records.filter((r) => r.setId === set.id).map((r) => r.type),
  }));

  let previousSummary: SummaryExercise["previous"] = null;
  if (previous) {
    const prior = workingStats(working(previous.sets));
    previousSummary = {
      startedAt: previous.startedAt,
      setCount: prior.setCount,
      volumeKg: prior.volumeKg,
      best: prior.best,
      volumeChangeKg: round2(stats.volumeKg - prior.volumeKg),
      topWeightChangeKg: stats.best && prior.best ? round2(stats.best.weightKg - prior.best.weightKg) : null,
      e1rmChangeKg: stats.bestE1rmKg !== null && prior.bestE1rmKg !== null ? round2(stats.bestE1rmKg - prior.bestE1rmKg) : null,
    };
  }

  return {
    id: exercise.id,
    exerciseId: exercise.exerciseId,
    name: exercise.name,
    notes: exercise.notes,
    sets: summarySets,
    setCount: stats.setCount,
    volumeKg: stats.volumeKg,
    best: stats.best,
    bestE1rmKg: stats.bestE1rmKg,
    recordCount: summarySets.reduce((n, s) => n + s.records.length, 0),
    previous: previousSummary,
  };
}

const GENERIC_NAME = "workout";
const normalizeName = (name: string) => name.trim().toLowerCase();

/**
 * Earlier workouts that really are the same workout: the same plan day, or the
 * same name. Empty workouts keep the default name "Workout", which says nothing
 * about their content, so that name alone never counts as a match.
 */
export function equivalentSessions(current: { name: string; workoutDayId: string | null }, prior: PriorSession[]) {
  const name = normalizeName(current.name);
  return prior.filter(
    (s) =>
      (current.workoutDayId !== null && s.workoutDayId === current.workoutDayId) ||
      (name !== GENERIC_NAME && normalizeName(s.name) === name),
  );
}

export type ExerciseComparison = {
  exerciseId: string;
  name: string;
  topWeightChangeKg: number | null;
  topWeightChangePercent: number | null;
  repsChange: number;
  volumeChangeKg: number;
  e1rmChangeKg: number | null;
  e1rmChangePercent: number | null;
  current: BestSet | null;
  previous: BestSet | null;
};

export type SessionComparison = {
  sessionId: string;
  name: string;
  startedAt: string;
  volumeChangeKg: number;
  volumeChangePercent: number | null;
  durationChangeMinutes: number | null;
  exercises: ExerciseComparison[];
  onlyThisSession: string[];
  onlyPreviousSession: string[];
};

function statsByExercise(state: TrackerState) {
  const grouped = new Map<string, { name: string; sets: LoggedSet[] }>();
  for (const exercise of state.exercises) {
    const entry = grouped.get(exercise.exerciseId) ?? { name: exercise.name, sets: [] };
    entry.sets.push(...working(loggedSets(exercise)));
    grouped.set(exercise.exerciseId, entry);
  }
  return new Map([...grouped].filter(([, e]) => e.sets.length).map(([id, e]) => [id, { name: e.name, stats: workingStats(e.sets) }]));
}

const totalVolume = (state: TrackerState) => round2([...statsByExercise(state).values()].reduce((sum, e) => sum + e.stats.volumeKg, 0));

const durationOf = (state: TrackerState) => sessionDurationMinutes({ startedAt: state.startedAt, endedAt: state.endedAt });

function buildComparison(state: TrackerState, equivalent: TrackerState): SessionComparison {
  const now = statsByExercise(state);
  const then = statsByExercise(equivalent);
  const volume = totalVolume(state);
  const previousVolume = totalVolume(equivalent);
  const duration = durationOf(state);
  const previousDuration = durationOf(equivalent);

  const exercises: ExerciseComparison[] = [];
  for (const [exerciseId, { name, stats }] of now) {
    const prior = then.get(exerciseId);
    if (!prior) continue;
    exercises.push({
      exerciseId,
      name,
      topWeightChangeKg: stats.best && prior.stats.best ? round2(stats.best.weightKg - prior.stats.best.weightKg) : null,
      topWeightChangePercent: stats.best && prior.stats.best ? percentChange(stats.best.weightKg, prior.stats.best.weightKg) : null,
      repsChange: stats.reps - prior.stats.reps,
      volumeChangeKg: round2(stats.volumeKg - prior.stats.volumeKg),
      e1rmChangeKg: stats.bestE1rmKg !== null && prior.stats.bestE1rmKg !== null ? round2(stats.bestE1rmKg - prior.stats.bestE1rmKg) : null,
      e1rmChangePercent: stats.bestE1rmKg !== null && prior.stats.bestE1rmKg !== null ? percentChange(stats.bestE1rmKg, prior.stats.bestE1rmKg) : null,
      current: stats.best,
      previous: prior.stats.best,
    });
  }

  return {
    sessionId: equivalent.sessionId,
    name: equivalent.name,
    startedAt: equivalent.startedAt,
    volumeChangeKg: round2(volume - previousVolume),
    volumeChangePercent: percentChange(volume, previousVolume),
    durationChangeMinutes: duration !== null && previousDuration !== null ? duration - previousDuration : null,
    exercises,
    onlyThisSession: [...now].filter(([id]) => !then.has(id)).map(([, e]) => e.name),
    onlyPreviousSession: [...then].filter(([id]) => !now.has(id)).map(([, e]) => e.name),
  };
}

export type MuscleBreakdown = { id: number; name: string; volumeKg: number; sets: number };

/**
 * Work by muscle, using the convention on the Progress page: a set counts fully
 * for an exercise's main muscle and as half for its secondary muscles. This is
 * logged work by classification, not a measure of muscle activation.
 */
export function muscleBreakdown(state: TrackerState, muscles: Map<string, ExerciseMuscles>): MuscleBreakdown[] {
  const totals = new Map<number, MuscleBreakdown>();
  const add = (id: number, name: string, volumeKg: number, sets: number) => {
    const entry = totals.get(id) ?? { id, name, volumeKg: 0, sets: 0 };
    entry.volumeKg = round2(entry.volumeKg + volumeKg);
    entry.sets += sets;
    totals.set(id, entry);
  };
  for (const [exerciseId, { stats }] of statsByExercise(state)) {
    const info = muscles.get(exerciseId);
    if (!info) continue;
    add(info.primary.id, info.primary.name, stats.volumeKg, stats.setCount);
    for (const secondary of info.secondary) {
      add(secondary.id, secondary.name, stats.volumeKg * SECONDARY_SET_WEIGHT, stats.setCount * SECONDARY_SET_WEIGHT);
    }
  }
  return [...totals.values()].sort((a, b) => b.volumeKg - a.volumeKg || b.sets - a.sets || a.name.localeCompare(b.name));
}

export type Highlight = { id: string; kind: "record" | "volume" | "progress"; title: string; detail: string };

const MAX_HIGHLIGHTS = 6;

function buildHighlights(
  state: TrackerState,
  exercises: SummaryExercise[],
  records: SummaryRecord[],
  equivalentPrior: PriorSession[],
): Highlight[] {
  const highlights: Highlight[] = [];
  const kg = (n: number) => `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(n)} kg`;

  // One line per exercise with a record; the actual lift is preferred over the estimate.
  const recordOrder: RecordType[] = ["max_weight", "best_e1rm", "max_reps"];
  for (const exerciseId of new Set(records.map((r) => r.exerciseId))) {
    const record = recordOrder.map((t) => records.find((r) => r.exerciseId === exerciseId && r.type === t)).find(Boolean)!;
    const detail =
      record.type === "max_weight"
        ? `Heaviest weight: ${kg(record.weightKg)} × ${record.reps}`
        : record.type === "best_e1rm"
          ? `Best est. 1RM: ${kg(record.value)}`
          : `Most reps in a set: ${record.reps}`;
    highlights.push({ id: `record-${exerciseId}`, kind: "record", title: `New ${record.exerciseName} record`, detail });
  }

  const volume = totalVolume(state);
  if (equivalentPrior.length && volume > 0) {
    const bestBefore = Math.max(...equivalentPrior.map((s) => s.volumeKg));
    if (volume > bestBefore) {
      highlights.push({
        id: "session-volume",
        kind: "volume",
        title: `Highest volume recorded for ${state.name}`,
        detail: `${kg(volume)}, up from ${kg(bestBefore)}`,
      });
    }
  }

  const improved = exercises.filter((e) => e.previous && e.previous.volumeChangeKg > 0);
  if (improved.length >= 2) {
    highlights.push({
      id: "improved-many",
      kind: "progress",
      title: `More volume on ${improved.length} exercises`,
      detail: "Compared with the last time you trained each one",
    });
  }

  const withVolume = exercises.filter((e) => e.volumeKg > 0);
  if (withVolume.length >= 2) {
    const top = withVolume.reduce((a, b) => (b.volumeKg > a.volumeKg ? b : a));
    highlights.push({ id: "top-exercise", kind: "volume", title: `Most volume: ${top.name}`, detail: `${kg(top.volumeKg)} this session` });
  }

  // Progress short of a record, so no exercise is announced twice.
  for (const exercise of exercises) {
    if (exercise.recordCount || !exercise.previous) continue;
    if ((exercise.previous.topWeightChangeKg ?? 0) > 0) {
      highlights.push({
        id: `weight-${exercise.id}`,
        kind: "progress",
        title: `Heavier ${exercise.name}`,
        detail: `+${kg(exercise.previous.topWeightChangeKg!)} on your top set since last time`,
      });
    } else if ((exercise.previous.e1rmChangeKg ?? 0) > 0) {
      highlights.push({
        id: `e1rm-${exercise.id}`,
        kind: "progress",
        title: `Est. 1RM up on ${exercise.name}`,
        detail: `+${kg(exercise.previous.e1rmChangeKg!)} estimated since last time`,
      });
    }
  }

  return highlights.slice(0, MAX_HIGHLIGHTS);
}

export type WorkoutSummary = {
  stats: { durationMinutes: number | null; volumeKg: number; exerciseCount: number; setCount: number; repCount: number; recordCount: number };
  exercises: SummaryExercise[];
  records: SummaryRecord[];
  comparison: SessionComparison | null;
  muscles: MuscleBreakdown[];
  highlights: Highlight[];
};

export function buildWorkoutSummary(input: {
  state: TrackerState;
  previous: Record<string, PreviousPerformance>;
  priorBests: PriorBest[];
  equivalentPrior: PriorSession[];
  /** The most recent equivalent workout, already loaded. */
  equivalent: TrackerState | null;
  muscles: Map<string, ExerciseMuscles>;
}): WorkoutSummary {
  const { state, previous, priorBests, equivalentPrior, equivalent, muscles } = input;
  const records = findRecords(state, priorBests);
  const exercises = state.exercises.map((e) => buildExercise(e, previous[e.exerciseId], records));
  const totals = [...statsByExercise(state).values()];

  return {
    stats: {
      durationMinutes: durationOf(state),
      volumeKg: totalVolume(state),
      exerciseCount: totals.length,
      setCount: totals.reduce((n, e) => n + e.stats.setCount, 0),
      repCount: totals.reduce((n, e) => n + e.stats.reps, 0),
      recordCount: records.length,
    },
    exercises,
    records,
    comparison: equivalent ? buildComparison(state, equivalent) : null,
    muscles: muscleBreakdown(state, muscles),
    highlights: buildHighlights(state, exercises, records, equivalentPrior),
  };
}

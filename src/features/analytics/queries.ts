import "server-only";

import type { CurrentUser } from "@/features/auth/queries";
import type { BodyRegion } from "@/features/exercises/constants";
import { listExercises, listMuscleGroups } from "@/features/exercises/queries";
import { addDays, toDateKey } from "@/lib/dates";
import { readAllPages } from "@/lib/supabase/read-all";
import { createClient } from "@/lib/supabase/server";

import {
  inPeriod,
  monthlyBuckets,
  muscleGroupVolume,
  percentChange,
  periodTotals,
  periodWeeks,
  previousPeriod,
  rangeStart,
  summarizeExercise,
  weeklyBuckets,
  type ExerciseMuscles,
  type ExerciseSessionStats,
  type Range,
  type SessionSummary,
} from "./calculations";

export type RecordType = "max_weight" | "max_reps" | "best_e1rm";

export type PersonalRecord = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  bodyRegion: BodyRegion | null;
  type: RecordType;
  value: number;
  weightKg: number;
  reps: number;
  achievedAt: string;
  sessionId: string | null;
  exerciseSetId: string | null;
};

function fail(context: string, message: string): never {
  throw new Error(`Could not load ${context}: ${message}`);
}

async function loadSessions(): Promise<SessionSummary[]> {
  const supabase = await createClient();
  const data = await readAllPages("workouts", (from, to) =>
    supabase
      .from("session_summaries")
      .select("id, name, started_at, ended_at, exercise_count, working_set_count, volume_kg")
      .eq("status", "completed")
      .order("started_at", { ascending: true })
      .order("id")
      .range(from, to),
  );
  return data.map((s) => ({
    id: s.id!,
    name: s.name!,
    startedAt: s.started_at!,
    endedAt: s.ended_at,
    exerciseCount: s.exercise_count ?? 0,
    workingSetCount: s.working_set_count ?? 0,
    volumeKg: Number(s.volume_kg ?? 0),
  }));
}

type BestRow = {
  exercise_id: string | null;
  exercise_name: string | null;
  session_id: string | null;
  started_at: string | null;
  top_weight_kg: number | null;
  top_weight_reps: number | null;
  max_reps: number | null;
  best_e1rm_kg: number | null;
  volume_kg: number | null;
  working_set_count: number | null;
};

const BEST_COLUMNS =
  "exercise_id, exercise_name, session_id, started_at, top_weight_kg, top_weight_reps, max_reps, best_e1rm_kg, volume_kg, working_set_count";

function toStats(r: BestRow): ExerciseSessionStats {
  return {
    sessionId: r.session_id!,
    startedAt: r.started_at!,
    topWeightKg: Number(r.top_weight_kg ?? 0),
    topWeightReps: r.top_weight_reps ?? 0,
    maxReps: r.max_reps ?? 0,
    bestE1rmKg: r.best_e1rm_kg == null ? null : Number(r.best_e1rm_kg),
    volumeKg: Number(r.volume_kg ?? 0),
    workingSets: r.working_set_count ?? 0,
  };
}

/** Lower bound for queries: one extra day absorbs timezone offsets; exact filtering happens in code. */
function queryFrom(from: string | null) {
  return from ? `${addDays(from, -1)}T00:00:00Z` : null;
}

export async function getProgressOverview(user: CurrentUser, range: Range) {
  const timeZone = user.timeZone;
  const today = toDateKey(new Date(), timeZone);
  const from = rangeStart(range, today);
  const previous = previousPeriod(range, today);

  const supabase = await createClient();
  const lower = queryFrom(from);
  const readBests = (pageFrom: number, pageTo: number) => {
    let query = supabase.from("exercise_session_bests").select(BEST_COLUMNS).order("started_at", { ascending: true }).order("session_exercise_id");
    if (lower) query = query.gte("started_at", lower);
    return query.range(pageFrom, pageTo);
  };

  const [sessions, bestRows, recordsRes, library, muscleGroups] = await Promise.all([
    loadSessions(),
    readAllPages("exercise progress", readBests),
    supabase.from("personal_records").select("id", { count: "exact", head: true }),
    listExercises(),
    listMuscleGroups(),
  ]);
  if (recordsRes.error) fail("personal records", recordsRes.error.message);

  const current = sessions.filter((s) => inPeriod(s.startedAt, timeZone, from, today));
  const before = previous ? sessions.filter((s) => inPeriod(s.startedAt, timeZone, previous.from, previous.to)) : null;
  const totals = periodTotals(current);
  const previousTotals = before ? periodTotals(before) : null;

  const muscleMap = new Map<string, ExerciseMuscles>(
    library.map((e) => [e.id, { primary: e.primaryMuscle, secondary: e.secondaryMuscles }]),
  );
  const firstActivity = sessions[0] ? toDateKey(sessions[0].startedAt, timeZone) : null;
  const logged: { exerciseId: string; workingSets: number }[] = [];

  const byExercise = new Map<string, { name: string; points: ExerciseSessionStats[] }>();
  for (const row of bestRows as BestRow[]) {
    if (!row.exercise_id || !row.started_at || !inPeriod(row.started_at, timeZone, from, today)) continue;
    const entry = byExercise.get(row.exercise_id) ?? { name: row.exercise_name ?? "Exercise", points: [] };
    entry.points.push(toStats(row));
    byExercise.set(row.exercise_id, entry);
    logged.push({ exerciseId: row.exercise_id, workingSets: row.working_set_count ?? 0 });
  }
  const muscleVolume = muscleGroupVolume(logged, muscleMap, periodWeeks(from, firstActivity, today));
  const trainedIds = new Set(muscleVolume.map((m) => m.id));
  const exercises = [...byExercise]
    .map(([id, { name, points }]) => ({ id, name, lastAt: points.at(-1)!.startedAt, ...summarizeExercise(points) }))
    .sort((a, b) => b.sessions - a.sessions || b.lastAt.localeCompare(a.lastAt));

  return {
    today,
    timeZone,
    totals,
    previousTotals,
    changes: previousTotals
      ? {
          workouts: percentChange(totals.workouts, previousTotals.workouts),
          volumeKg: percentChange(totals.volumeKg, previousTotals.volumeKg),
          workingSets: percentChange(totals.workingSets, previousTotals.workingSets),
        }
      : null,
    weekly: weeklyBuckets(sessions, today, timeZone, 12),
    monthly: monthlyBuckets(sessions, today, timeZone, 12),
    exercises,
    muscleVolume,
    untrainedMuscles: muscleGroups.filter((m) => !trainedIds.has(m.id)).map((m) => m.name),
    personalRecords: recordsRes.count ?? 0,
    hasAnyWorkouts: sessions.length > 0,
  };
}

export async function getExerciseProgress(user: CurrentUser, exerciseId: string, range: Range) {
  const timeZone = user.timeZone;
  const today = toDateKey(new Date(), timeZone);
  const from = rangeStart(range, today);

  const supabase = await createClient();
  const [bestRows, recordsRes] = await Promise.all([
    readAllPages("exercise progress", (pageFrom, pageTo) =>
      supabase
        .from("exercise_session_bests")
        .select(BEST_COLUMNS)
        .eq("exercise_id", exerciseId)
        .order("started_at", { ascending: true })
        .order("session_exercise_id")
        .range(pageFrom, pageTo),
    ),
    supabase
      .from("personal_records")
      .select("id, record_type, value, weight_kg, reps, achieved_at, session_id, exercise_set_id")
      .eq("exercise_id", exerciseId),
  ]);
  if (recordsRes.error) fail("personal records", recordsRes.error.message);

  const all = (bestRows as BestRow[]).map(toStats);
  const points = all.filter((p) => inPeriod(p.startedAt, timeZone, from, today));

  return {
    timeZone,
    points,
    summary: summarizeExercise(points),
    totalSessions: all.length,
    records: recordsRes.data.map((r) => ({
      type: r.record_type as RecordType,
      value: Number(r.value),
      weightKg: Number(r.weight_kg),
      reps: r.reps,
      achievedAt: r.achieved_at,
      sessionId: r.session_id,
    })),
  };
}

export async function listPersonalRecords(): Promise<PersonalRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("personal_records")
    .select(
      `id, exercise_id, record_type, value, weight_kg, reps, achieved_at, session_id, exercise_set_id,
       exercises(name, primary:muscle_groups!exercises_primary_muscle_group_id_fkey(body_region))`,
    )
    .order("achieved_at", { ascending: false });
  if (error) fail("personal records", error.message);
  return data.map((r) => ({
    id: r.id,
    exerciseId: r.exercise_id,
    exerciseName: r.exercises?.name ?? "Exercise",
    bodyRegion: (r.exercises?.primary?.body_region as BodyRegion | undefined) ?? null,
    type: r.record_type as RecordType,
    value: Number(r.value),
    weightKg: Number(r.weight_kg),
    reps: r.reps,
    achievedAt: r.achieved_at,
    sessionId: r.session_id,
    exerciseSetId: r.exercise_set_id,
  }));
}

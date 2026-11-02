import "server-only";

import {
  currentWeekDays,
  progressionHighlights,
  sessionDurationMinutes,
  totalVolume,
  weeklyBuckets,
  type ExerciseSessionBest,
  type SessionSummary,
} from "@/features/analytics/calculations";
import type { CurrentUser } from "@/features/auth/queries";
import { addDays, startOfWeek, toDateKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

import { resolveTodaySchedule, type ActivePlanInput } from "./today";

const CHART_WEEKS = 12;
const HIGHLIGHT_LOOKBACK_DAYS = 180;

function fail(context: string, message: string): never {
  throw new Error(`Could not load ${context}: ${message}`);
}

/** Everything the dashboard shows, computed from the user's recorded data. */
export async function getDashboardData(user: CurrentUser) {
  const supabase = await createClient();
  const timeZone = user.timeZone;
  const now = new Date();
  const today = toDateKey(now, timeZone);
  const lookbackFrom = new Date(now.getTime() - HIGHLIGHT_LOOKBACK_DAYS * 86_400_000).toISOString();

  const [sessionsRes, recordsCountRes, latestRecordsRes, bestsRes, planRes] = await Promise.all([
    supabase
      .from("session_summaries")
      .select("id, name, started_at, ended_at, exercise_count, working_set_count, volume_kg")
      .eq("status", "completed")
      .order("started_at", { ascending: false }),
    supabase.from("personal_records").select("id", { count: "exact", head: true }),
    supabase
      .from("personal_records")
      .select("id, record_type, value, weight_kg, reps, achieved_at, exercises(name)")
      .order("achieved_at", { ascending: false })
      .limit(3),
    supabase
      .from("exercise_session_bests")
      .select("exercise_id, exercise_name, started_at, top_weight_kg, top_weight_reps, best_e1rm_kg")
      .gte("started_at", lookbackFrom)
      .order("started_at", { ascending: false })
      .limit(1000),
    supabase
      .from("workout_plans")
      .select(
        "id, name, workout_days(id, name, position, weekday, is_rest_day, plan_exercises(id, position, target_sets, target_reps_min, target_reps_max, exercises(name)))",
      )
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  if (sessionsRes.error) fail("workouts", sessionsRes.error.message);
  if (recordsCountRes.error) fail("personal records", recordsCountRes.error.message);
  if (latestRecordsRes.error) fail("personal records", latestRecordsRes.error.message);
  if (bestsRes.error) fail("exercise progress", bestsRes.error.message);
  if (planRes.error) fail("workout plan", planRes.error.message);

  const sessions: SessionSummary[] = (sessionsRes.data ?? []).map((s) => ({
    id: s.id!,
    name: s.name!,
    startedAt: s.started_at!,
    endedAt: s.ended_at,
    exerciseCount: s.exercise_count ?? 0,
    workingSetCount: s.working_set_count ?? 0,
    volumeKg: Number(s.volume_kg ?? 0),
  }));

  const weekStart = startOfWeek(today);
  const lastWeekStart = addDays(weekStart, -7);
  const sessionsByWeek = { thisWeek: 0, lastWeek: 0, thisWeekVolume: 0 };
  for (const s of sessions) {
    const week = startOfWeek(toDateKey(s.startedAt, timeZone));
    if (week === weekStart) {
      sessionsByWeek.thisWeek += 1;
      sessionsByWeek.thisWeekVolume += s.volumeKg;
    } else if (week === lastWeekStart) {
      sessionsByWeek.lastWeek += 1;
    }
  }

  const bests: ExerciseSessionBest[] = (bestsRes.data ?? []).map((b) => ({
    exerciseId: b.exercise_id!,
    exerciseName: b.exercise_name!,
    startedAt: b.started_at!,
    topWeightKg: Number(b.top_weight_kg ?? 0),
    topWeightReps: b.top_weight_reps ?? 0,
    bestE1rmKg: b.best_e1rm_kg == null ? null : Number(b.best_e1rm_kg),
  }));

  const plan: ActivePlanInput = planRes.data
    ? {
        id: planRes.data.id,
        name: planRes.data.name,
        days: planRes.data.workout_days.map((d) => ({
          id: d.id,
          name: d.name,
          position: d.position,
          weekday: d.weekday,
          isRestDay: d.is_rest_day,
          exercises: [...d.plan_exercises]
            .sort((a, b) => a.position - b.position)
            .map((pe) => ({
              id: pe.id,
              name: pe.exercises?.name ?? "Exercise",
              targetSets: pe.target_sets,
              targetRepsMin: pe.target_reps_min,
              targetRepsMax: pe.target_reps_max,
            })),
        })),
      }
    : null;

  // Workout days already completed today (session linked to the plan day).
  const completedTodayRes = await supabase
    .from("workout_sessions")
    .select("workout_day_id, started_at")
    .eq("status", "completed")
    .not("workout_day_id", "is", null)
    .gte("started_at", new Date(now.getTime() - 2 * 86_400_000).toISOString());
  if (completedTodayRes.error) fail("today's workout", completedTodayRes.error.message);
  const completedDayIds = new Set(
    (completedTodayRes.data ?? [])
      .filter((s) => toDateKey(s.started_at, timeZone) === today)
      .map((s) => s.workout_day_id!),
  );

  return {
    today,
    timeZone,
    stats: {
      totalWorkouts: sessions.length,
      workoutsThisWeek: sessionsByWeek.thisWeek,
      workoutsLastWeek: sessionsByWeek.lastWeek,
      volumeThisWeekKg: Math.round(sessionsByWeek.thisWeekVolume * 100) / 100,
      totalVolumeKg: totalVolume(sessions),
      personalRecords: recordsCountRes.count ?? 0,
    },
    latestRecords: (latestRecordsRes.data ?? []).map((r) => ({
      id: r.id,
      type: r.record_type as "max_weight" | "max_reps" | "best_e1rm",
      value: Number(r.value),
      weightKg: Number(r.weight_kg),
      reps: r.reps,
      achievedAt: r.achieved_at,
      exerciseName: r.exercises?.name ?? "Exercise",
    })),
    weekDays: currentWeekDays(sessions, today, timeZone),
    weeklyBuckets: weeklyBuckets(sessions, today, timeZone, CHART_WEEKS),
    recentWorkouts: sessions.slice(0, 6).map((s) => ({ ...s, durationMinutes: sessionDurationMinutes(s) })),
    highlights: progressionHighlights(bests, today, timeZone),
    todaySchedule: resolveTodaySchedule(plan, today, completedDayIds),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

import { isoWeekday, type DateKey } from "@/lib/dates";

export type PlanDayInput = {
  id: string;
  name: string;
  position: number;
  weekday: number | null;
  isRestDay: boolean;
  exercises: { id: string; name: string; targetSets: number; targetRepsMin: number; targetRepsMax: number }[];
};

export type ActivePlanInput = { id: string; name: string; days: PlanDayInput[] } | null;

export type TodaySchedule =
  | { kind: "no-plan" }
  | { kind: "rest"; planName: string; day: PlanDayInput }
  | { kind: "unscheduled"; planName: string; next: { day: PlanDayInput; inDays: number } | null }
  | { kind: "workout"; planName: string; day: PlanDayInput; completedToday: boolean };

/**
 * Resolves what the active plan has scheduled for today, using ISO weekdays
 * assigned to plan days. `completedDayIds` are workout days already finished today.
 */
export function resolveTodaySchedule(
  plan: ActivePlanInput,
  today: DateKey,
  completedDayIds: Set<string>,
): TodaySchedule {
  if (!plan) return { kind: "no-plan" };

  const weekday = isoWeekday(today);
  const days = [...plan.days].sort((a, b) => a.position - b.position);
  const todayDay = days.find((d) => d.weekday === weekday);

  if (todayDay?.isRestDay) return { kind: "rest", planName: plan.name, day: todayDay };
  if (todayDay) {
    return { kind: "workout", planName: plan.name, day: todayDay, completedToday: completedDayIds.has(todayDay.id) };
  }

  let next: { day: PlanDayInput; inDays: number } | null = null;
  for (const day of days) {
    if (day.weekday == null || day.isRestDay) continue;
    const inDays = (day.weekday - weekday + 7) % 7 || 7;
    if (!next || inDays < next.inDays) next = { day, inDays };
  }
  return { kind: "unscheduled", planName: plan.name, next };
}

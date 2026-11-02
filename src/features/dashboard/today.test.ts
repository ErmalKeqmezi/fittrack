import { describe, expect, it } from "vitest";

import { resolveTodaySchedule, type ActivePlanInput, type PlanDayInput } from "./today";

const day = (id: string, position: number, weekday: number | null, isRestDay = false): PlanDayInput => ({
  id,
  name: id,
  position,
  weekday,
  isRestDay,
  exercises: [],
});

const plan: ActivePlanInput = {
  id: "p",
  name: "PPL",
  days: [day("push", 0, 1), day("pull", 1, 3), day("rest", 2, 7, true), day("legs", 3, 5)],
};

describe("resolveTodaySchedule", () => {
  // 2026-11-02 is a Monday
  it("returns no-plan without an active plan", () => {
    expect(resolveTodaySchedule(null, "2026-11-02", new Set())).toEqual({ kind: "no-plan" });
  });

  it("finds today's workout and whether it is done", () => {
    const result = resolveTodaySchedule(plan, "2026-11-02", new Set(["push"]));
    expect(result).toMatchObject({ kind: "workout", day: { id: "push" }, completedToday: true });
  });

  it("recognises rest days", () => {
    expect(resolveTodaySchedule(plan, "2026-11-08", new Set())).toMatchObject({ kind: "rest" });
  });

  it("points to the next scheduled training day, wrapping the week", () => {
    expect(resolveTodaySchedule(plan, "2026-11-03", new Set())).toMatchObject({
      kind: "unscheduled",
      next: { day: { id: "pull" }, inDays: 1 },
    });
    expect(resolveTodaySchedule(plan, "2026-11-07", new Set())).toMatchObject({
      kind: "unscheduled",
      next: { day: { id: "push" }, inDays: 2 },
    });
  });
});

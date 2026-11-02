import { describe, expect, it } from "vitest";

import {
  currentWeekDays,
  estimateOneRepMax,
  progressionHighlights,
  sessionDurationMinutes,
  totalVolume,
  weeklyBuckets,
  type ExerciseSessionBest,
} from "./calculations";

describe("estimateOneRepMax", () => {
  it("uses Epley for 2–12 reps and the weight itself for a single", () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(estimateOneRepMax(70, 10)).toBe(93.33);
    expect(estimateOneRepMax(100, 5)).toBe(116.67);
  });

  it("returns null when no reliable estimate exists", () => {
    expect(estimateOneRepMax(60, 13)).toBeNull();
    expect(estimateOneRepMax(60, 0)).toBeNull();
    expect(estimateOneRepMax(0, 10)).toBeNull();
  });
});

describe("session aggregates", () => {
  it("sums volume and computes duration", () => {
    expect(totalVolume([{ volumeKg: 1500.5 }, { volumeKg: 2000.25 }])).toBe(3500.75);
    expect(totalVolume([])).toBe(0);
    expect(
      sessionDurationMinutes({ startedAt: "2026-11-02T10:00:00Z", endedAt: "2026-11-02T11:05:30Z" }),
    ).toBe(66);
    expect(sessionDurationMinutes({ startedAt: "2026-11-02T10:00:00Z", endedAt: null })).toBeNull();
  });
});

describe("weeklyBuckets", () => {
  const sessions = [
    { startedAt: "2026-11-02T09:00:00Z", volumeKg: 1000 }, // this week (Mon)
    { startedAt: "2026-10-30T09:00:00Z", volumeKg: 500 }, // last week (Fri)
    { startedAt: "2026-10-27T09:00:00Z", volumeKg: 250 }, // last week (Tue)
    { startedAt: "2026-01-01T09:00:00Z", volumeKg: 9999 }, // outside the window
  ];

  it("returns contiguous weeks, oldest first, including empty ones", () => {
    const buckets = weeklyBuckets(sessions, "2026-11-04", "UTC", 4);
    expect(buckets.map((b) => b.weekStart)).toEqual(["2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02"]);
    expect(buckets.map((b) => b.workouts)).toEqual([0, 0, 2, 1]);
    expect(buckets.map((b) => b.volumeKg)).toEqual([0, 0, 750, 1000]);
  });

  it("buckets by the user's local day", () => {
    // Sunday 23:30 UTC is Monday in Tirana, so it belongs to the new week there.
    const late = [{ startedAt: "2026-11-01T23:30:00Z", volumeKg: 100 }];
    expect(weeklyBuckets(late, "2026-11-02", "UTC", 2).map((b) => b.workouts)).toEqual([1, 0]);
    expect(weeklyBuckets(late, "2026-11-02", "Europe/Tirane", 2).map((b) => b.workouts)).toEqual([0, 1]);
  });
});

describe("currentWeekDays", () => {
  it("marks trained days, today and future days", () => {
    const days = currentWeekDays([{ startedAt: "2026-11-03T18:00:00Z" }], "2026-11-04", "UTC");
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe("2026-11-02");
    expect(days[1].workouts).toBe(1);
    expect(days[2].isToday).toBe(true);
    expect(days[3].isFuture).toBe(true);
  });
});

describe("progressionHighlights", () => {
  const best = (exerciseId: string, startedAt: string, topWeightKg: number, reps: number, e1rm: number | null): ExerciseSessionBest => ({
    exerciseId,
    exerciseName: exerciseId,
    startedAt,
    topWeightKg,
    topWeightReps: reps,
    bestE1rmKg: e1rm,
  });

  it("compares the latest session with the previous one per exercise", () => {
    const rows = [
      best("bench", "2026-11-01T10:00:00Z", 72.5, 8, 91.83),
      best("squat", "2026-10-30T10:00:00Z", 100, 5, 116.67),
      best("bench", "2026-10-28T10:00:00Z", 70, 8, 88.67),
      best("bench", "2026-10-20T10:00:00Z", 67.5, 8, 85.5),
    ];
    const result = progressionHighlights(rows, "2026-11-02", "UTC");
    // squat has only one session, so it is not compared
    expect(result).toHaveLength(1);
    expect(result[0].topWeightChangeKg).toBe(2.5);
    expect(result[0].e1rmChangeKg).toBe(3.16);
    expect(result[0].previous.startedAt).toBe("2026-10-28T10:00:00Z");
  });

  it("skips stale exercises and keeps e1RM null when not estimable", () => {
    const rows = [
      best("plank", "2026-11-01T10:00:00Z", 0, 60, null),
      best("plank", "2026-10-25T10:00:00Z", 0, 45, null),
      best("curl", "2026-08-01T10:00:00Z", 15, 10, 20),
      best("curl", "2026-07-01T10:00:00Z", 12.5, 10, 16.67),
    ];
    const result = progressionHighlights(rows, "2026-11-02", "UTC");
    expect(result.map((r) => r.exerciseId)).toEqual(["plank"]);
    expect(result[0].e1rmChangeKg).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import { addMonths } from "@/lib/dates";

import {
  inPeriod,
  monthlyBuckets,
  parseRange,
  percentChange,
  periodTotals,
  previousPeriod,
  rangeStart,
  summarizeExercise,
  type ExerciseSessionStats,
} from "./calculations";

describe("ranges", () => {
  it("computes inclusive range starts", () => {
    expect(rangeStart("7d", "2026-11-02")).toBe("2026-10-27");
    expect(rangeStart("30d", "2026-11-02")).toBe("2026-10-04");
    expect(rangeStart("3m", "2026-11-02")).toBe("2026-08-03");
    expect(rangeStart("6m", "2026-11-02")).toBe("2026-05-03");
    expect(rangeStart("all", "2026-11-02")).toBeNull();
  });

  it("finds the equally long previous period", () => {
    expect(previousPeriod("7d", "2026-11-02")).toEqual({ from: "2026-10-20", to: "2026-10-26" });
    expect(previousPeriod("all", "2026-11-02")).toBeNull();
  });

  it("parses unknown ranges to the fallback", () => {
    expect(parseRange("30d")).toBe("30d");
    expect(parseRange("1y")).toBe("3m");
    expect(parseRange(undefined, "all")).toBe("all");
  });

  it("adds months with clamping", () => {
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonths("2026-11-15", 2)).toBe("2027-01-15");
  });

  it("checks periods in the user's timezone", () => {
    expect(inPeriod("2026-10-26T23:30:00Z", "Europe/Tirane", "2026-10-27", "2026-11-02")).toBe(true);
    expect(inPeriod("2026-10-26T23:30:00Z", "UTC", "2026-10-27", "2026-11-02")).toBe(false);
  });
});

describe("period totals", () => {
  const session = (startedAt: string, volumeKg: number, minutes: number | null, sets = 10) => ({
    id: startedAt,
    name: "W",
    startedAt,
    endedAt: minutes === null ? null : new Date(Date.parse(startedAt) + minutes * 60000).toISOString(),
    exerciseCount: 3,
    workingSetCount: sets,
    volumeKg,
  });

  it("totals sessions and averages known durations", () => {
    expect(periodTotals([session("2026-11-01T10:00:00Z", 1000, 60), session("2026-11-02T10:00:00Z", 500, null, 5)])).toEqual({
      workouts: 2,
      volumeKg: 1500,
      workingSets: 15,
      avgDurationMinutes: 60,
    });
    expect(periodTotals([]).avgDurationMinutes).toBeNull();
  });

  it("computes percent change only against a non-zero base", () => {
    expect(percentChange(1500, 1000)).toBe(50);
    expect(percentChange(900, 1000)).toBe(-10);
    expect(percentChange(5, 0)).toBeNull();
  });

  it("buckets by calendar month", () => {
    const buckets = monthlyBuckets([session("2026-10-31T23:30:00Z", 100, 60), session("2026-09-10T10:00:00Z", 50, 60)], "2026-11-02", "Europe/Tirane", 3);
    expect(buckets.map((b) => [b.monthStart, b.volumeKg])).toEqual([
      ["2026-09-01", 50],
      ["2026-10-01", 0],
      ["2026-11-01", 100],
    ]);
  });
});

describe("summarizeExercise", () => {
  const p = (startedAt: string, w: number, r: number, e1rm: number | null, volume: number): ExerciseSessionStats => ({
    sessionId: startedAt,
    startedAt,
    topWeightKg: w,
    topWeightReps: r,
    maxReps: r,
    bestE1rmKg: e1rm,
    volumeKg: volume,
    workingSets: 3,
  });

  it("keeps actual and estimated bests separate and compares first vs last", () => {
    const summary = summarizeExercise([
      p("2026-10-01", 70, 10, 93.33, 2000),
      p("2026-10-15", 80, 3, 88, 1500),
      p("2026-10-29", 75, 8, 95, 2100),
    ]);
    expect(summary.bestTopSet).toEqual({ weightKg: 80, reps: 3, startedAt: "2026-10-15" });
    expect(summary.bestE1rmKg).toBe(95);
    expect(summary.topWeightChangeKg).toBe(5);
    expect(summary.e1rmChangeKg).toBe(1.67);
    expect(summary.volumeKg).toBe(5600);
  });

  it("does not compare a single session", () => {
    const summary = summarizeExercise([p("2026-10-01", 70, 10, 93.33, 2000)]);
    expect(summary.topWeightChangeKg).toBeNull();
    expect(summary.e1rmChangeKg).toBeNull();
    expect(summarizeExercise([]).bestTopSet).toBeNull();
  });
});

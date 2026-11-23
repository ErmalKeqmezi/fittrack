import { describe, expect, it } from "vitest";

import { monthActivity, parseMonthKey, shiftMonth } from "./month-activity";

describe("monthActivity", () => {
  const trained = new Set(["2026-11-02", "2026-11-23", "2026-10-31", "2026-12-01"]);
  const november = monthActivity(2026, 11, trained, "2026-11-23");
  const days = november.cells.filter((c) => c !== null);

  it("lays the month out Monday first, with blanks before the 1st", () => {
    // 1 Nov 2026 is a Sunday: six blanks, Monday to Saturday.
    expect(november.cells.slice(0, 7)).toEqual([null, null, null, null, null, null, expect.objectContaining({ date: "2026-11-01", day: 1 })]);
    // 1 Jun 2026 is a Monday: no blanks.
    expect(monthActivity(2026, 6, new Set(), "2026-11-23").cells[0]).toMatchObject({ date: "2026-06-01" });
  });

  it("has every day of the month, leap years included", () => {
    expect(days).toHaveLength(30);
    expect(monthActivity(2028, 2, new Set(), "2028-01-01").cells.filter(Boolean)).toHaveLength(29);
    expect(monthActivity(2026, 2, new Set(), "2026-01-01").cells.filter(Boolean)).toHaveLength(28);
  });

  it("counts trained days in this month only", () => {
    expect(november.trainedDays).toBe(2);
    expect(days.filter((c) => c.trained).map((c) => c.day)).toEqual([2, 23]);
  });

  it("marks today and the days still to come", () => {
    expect(days.find((c) => c.day === 23)).toMatchObject({ isToday: true, isFuture: false, trained: true });
    expect(days.find((c) => c.day === 24)).toMatchObject({ isToday: false, isFuture: true });
    expect(days.find((c) => c.day === 22)).toMatchObject({ isFuture: false });
  });
});

describe("month helpers", () => {
  it("parses only real months", () => {
    expect(parseMonthKey("2026-11")).toEqual({ year: 2026, month: 11 });
    expect(parseMonthKey("2026-13")).toBeNull();
    expect(parseMonthKey("2026-1")).toBeNull();
    expect(parseMonthKey(undefined)).toBeNull();
  });

  it("moves across year ends", () => {
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 5 }, 0)).toEqual({ year: 2026, month: 5 });
  });
});

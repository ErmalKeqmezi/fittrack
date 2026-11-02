import { describe, expect, it } from "vitest";

import { addDays, daysBetween, isoWeekday, isValidTimeZone, startOfWeek, toDateKey } from "./dates";

describe("dates", () => {
  it("converts instants to the local calendar day of the timezone", () => {
    // 23:30 UTC on Sunday is already Monday in Tirana (UTC+1 in November)
    expect(toDateKey("2026-11-01T23:30:00Z", "Europe/Tirane")).toBe("2026-11-02");
    expect(toDateKey("2026-11-01T23:30:00Z", "UTC")).toBe("2026-11-01");
    expect(toDateKey("2026-11-02T03:00:00Z", "America/New_York")).toBe("2026-11-01");
  });

  it("computes ISO weekdays and Monday week starts", () => {
    expect(isoWeekday("2026-11-02")).toBe(1); // Monday
    expect(isoWeekday("2026-11-08")).toBe(7); // Sunday
    expect(startOfWeek("2026-11-08")).toBe("2026-11-02");
    expect(startOfWeek("2026-11-02")).toBe("2026-11-02");
    expect(startOfWeek("2027-01-01")).toBe("2026-12-28");
  });

  it("adds days across month, year and DST boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-29", -1)).toBe("2026-03-28");
    expect(daysBetween("2026-10-01", "2026-11-02")).toBe(32);
  });

  it("validates timezone names", () => {
    expect(isValidTimeZone("Europe/Tirane")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { formatRest, formatTargets } from "./constants";
import { daySchema, targetsSchema } from "./schemas";

describe("planner schemas", () => {
  it("parses day form values", () => {
    expect(daySchema.parse({ name: " Push ", weekday: "", isRestDay: null })).toEqual({
      name: "Push",
      weekday: null,
      isRestDay: false,
      notes: "",
    });
    expect(daySchema.parse({ name: "Rest", weekday: "7", isRestDay: "on" })).toMatchObject({ weekday: 7, isRestDay: true });
    expect(daySchema.safeParse({ name: "X", weekday: "8", isRestDay: null }).success).toBe(false);
  });

  it("validates targets", () => {
    expect(targetsSchema.parse({ targetSets: "3", targetRepsMin: "8", targetRepsMax: "12", restSeconds: "" })).toMatchObject({
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 12,
      restSeconds: null,
    });
    const bad = targetsSchema.safeParse({ targetSets: "3", targetRepsMin: "12", targetRepsMax: "8", restSeconds: "90" });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0].path).toEqual(["targetRepsMax"]);
    expect(targetsSchema.safeParse({ targetSets: "0", targetRepsMin: "8", targetRepsMax: "8" }).success).toBe(false);
  });

  it("formats targets and rest", () => {
    expect(formatTargets(3, 8, 12)).toBe("3 × 8–12");
    expect(formatTargets(5, 5, 5)).toBe("5 × 5");
    expect(formatRest(90)).toBe("1:30 min");
    expect(formatRest(120)).toBe("2 min");
    expect(formatRest(45)).toBe("45 s");
    expect(formatRest(null)).toBeNull();
  });
});

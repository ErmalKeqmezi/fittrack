import { describe, expect, it } from "vitest";

import { formatKg, formatVolume } from "./format";

describe("formatVolume", () => {
  it("always uses kilograms, never tonnes", () => {
    expect(formatVolume(950)).toBe("950 kg");
    expect(formatVolume(19_500)).toBe("19,500 kg");
    expect(formatVolume(1_234_567.4)).toBe("1,234,567 kg");
    expect(formatVolume(0)).toBe("0 kg");
  });

  it("keeps decimals for single weights", () => {
    expect(formatKg(72.5)).toBe("72.5 kg");
  });
});

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { currentMetrics, loggedMetrics, metricSeries } from "./calculations";
import { formatMetric, METRICS, type Measurement } from "./constants";
import { parseMeasurement } from "./schemas";

const TODAY = "2026-11-05";

describe("parseMeasurement", () => {
  it("keeps only filled fields and accepts a decimal comma", () => {
    const result = parseMeasurement({ measured_on: TODAY, weight_kg: "82,5", biceps_cm: " 38 ", chest_cm: "" }, TODAY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.values.weight_kg).toBe(82.5);
    expect(result.data.values.biceps_cm).toBe(38);
    expect(result.data.values.chest_cm).toBeNull();
  });

  it("requires at least one measurement", () => {
    expect(parseMeasurement({ measured_on: TODAY }, TODAY)).toEqual({ ok: false, errors: { form: "Enter at least one measurement." } });
  });

  it("refuses out-of-range values and text", () => {
    const result = parseMeasurement({ measured_on: TODAY, weight_kg: "5", biceps_cm: "big" }, TODAY);
    expect(result).toMatchObject({ ok: false, errors: { weight_kg: "Enter 20–500 kg.", biceps_cm: "Enter 5–300 cm." } });
  });

  it("refuses future and impossible dates", () => {
    expect(parseMeasurement({ measured_on: "2026-11-06", weight_kg: "80" }, TODAY)).toMatchObject({
      errors: { measured_on: "The date can't be in the future." },
    });
    expect(parseMeasurement({ measured_on: "2026-02-31", weight_kg: "80" }, TODAY)).toMatchObject({
      errors: { measured_on: "Choose a valid date." },
    });
  });

  it("uses the same columns as the database", () => {
    const dir = join(process.cwd(), "supabase/migrations");
    const sql = readFileSync(join(dir, readdirSync(dir).find((f) => f.endsWith("body_measurements.sql"))!), "utf8");
    for (const metric of METRICS) expect(sql).toContain(`check (${metric.key} between ${metric.min} and ${metric.max})`);
  });
});

function entry(measured_on: string, values: Partial<Measurement>): Measurement {
  const empty = Object.fromEntries(METRICS.map((m) => [m.key, null]));
  return { id: measured_on, measured_on, ...empty, ...values } as Measurement;
}

const entries = [
  entry("2026-11-05", { weight_kg: 82 }),
  entry("2026-10-20", { weight_kg: 83.5, biceps_cm: 38 }),
  entry("2026-10-01", { weight_kg: 85, biceps_cm: 37.5 }),
];

describe("body calculations", () => {
  it("takes each metric's latest value, even when the newest entry skips it", () => {
    const current = currentMetrics(entries);
    const weight = current.find((c) => c.metric.key === "weight_kg")!;
    expect(weight).toMatchObject({ value: 82, measuredOn: "2026-11-05", change: -1.5 });
    const biceps = current.find((c) => c.metric.key === "biceps_cm")!;
    expect(biceps).toMatchObject({ value: 38, measuredOn: "2026-10-20", change: 0.5 });
  });

  it("shows no change for a single value or nothing logged", () => {
    const current = currentMetrics([entry("2026-11-05", { chest_cm: 100 })]);
    expect(current.find((c) => c.metric.key === "chest_cm")!.change).toBeNull();
    expect(current.find((c) => c.metric.key === "calves_cm")).toMatchObject({ value: null, measuredOn: null, change: null });
  });

  it("builds a series oldest first, skipping gaps and earlier dates", () => {
    expect(metricSeries(entries, "biceps_cm", null)).toEqual([
      { date: "2026-10-01", value: 37.5 },
      { date: "2026-10-20", value: 38 },
    ]);
    expect(metricSeries(entries, "weight_kg", "2026-10-20").map((p) => p.value)).toEqual([83.5, 82]);
  });

  it("lists logged values and formats units", () => {
    expect(loggedMetrics(entries[1]).map((m) => m.metric.label)).toEqual(["Weight", "Biceps"]);
    expect(formatMetric(82.5, "kg")).toBe("82.5 kg");
    expect(formatMetric(15, "%")).toBe("15%");
  });
});

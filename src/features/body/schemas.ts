import { z } from "zod";

import { METRICS, type MeasurementValues, type MetricKey } from "./constants";

export type MeasurementInput = { measured_on: string; values: MeasurementValues };
export type MeasurementFieldErrors = Partial<Record<MetricKey | "measured_on" | "form", string>>;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const dateSchema = z.string().regex(DATE, "Choose a date.").refine(isRealDate, "Choose a valid date.");

/**
 * Validates the form. Empty fields are simply not logged; at least one metric
 * is required. `today` is the user's local date: future entries are refused.
 */
export function parseMeasurement(
  raw: Record<string, unknown>,
  today: string,
): { ok: true; data: MeasurementInput } | { ok: false; errors: MeasurementFieldErrors } {
  const errors: MeasurementFieldErrors = {};

  const date = dateSchema.safeParse(raw.measured_on);
  if (!date.success) errors.measured_on = date.error.issues[0].message;
  else if (date.data > today) errors.measured_on = "The date can't be in the future.";

  const values = {} as MeasurementValues;
  for (const metric of METRICS) {
    const text = String(raw[metric.key] ?? "").trim().replace(",", ".");
    if (!text) {
      values[metric.key] = null;
      continue;
    }
    const number = Number(text);
    if (!Number.isFinite(number) || number < metric.min || number > metric.max) {
      errors[metric.key] = `Enter ${metric.min}–${metric.max} ${metric.unit}.`;
      values[metric.key] = null;
    } else {
      values[metric.key] = Math.round(number * 100) / 100;
    }
  }

  if (!Object.keys(errors).length && METRICS.every((m) => values[m.key] === null)) {
    errors.form = "Enter at least one measurement.";
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { measured_on: date.data as string, values } };
}

import type { DateKey } from "@/lib/dates";

import { METRICS, type Measurement, type Metric, type MetricKey } from "./constants";

export type CurrentMetric = {
  metric: Metric;
  value: number | null;
  measuredOn: string | null;
  /** Difference from the previous time this metric was logged; null if there is none. */
  change: number | null;
};

/** The latest logged value of each metric. Input is newest first; metrics may skip entries. */
export function currentMetrics(entriesNewestFirst: Measurement[]): CurrentMetric[] {
  return METRICS.map((metric) => {
    const logged = entriesNewestFirst.filter((e) => e[metric.key] !== null);
    const latest = logged[0];
    const previous = logged[1];
    return {
      metric,
      value: latest ? latest[metric.key] : null,
      measuredOn: latest?.measured_on ?? null,
      change: latest && previous ? Math.round((latest[metric.key]! - previous[metric.key]!) * 100) / 100 : null,
    };
  });
}

export type MetricPoint = { date: DateKey; value: number };

/** One metric over time, oldest first, optionally from a start date. */
export function metricSeries(entriesNewestFirst: Measurement[], key: MetricKey, from: DateKey | null): MetricPoint[] {
  const points: MetricPoint[] = [];
  for (const entry of entriesNewestFirst) {
    const value = entry[key];
    if (value !== null && (!from || entry.measured_on >= from)) points.push({ date: entry.measured_on, value });
  }
  return points.reverse();
}

/** Only the values actually logged in an entry, for history rows. */
export function loggedMetrics(entry: Measurement) {
  return METRICS.filter((m) => entry[m.key] !== null).map((metric) => ({ metric, value: entry[metric.key]! }));
}

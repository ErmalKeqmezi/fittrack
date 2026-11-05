"use client";

import { useState } from "react";

import { LazyProgressLineChart as ProgressLineChart } from "@/components/charts/lazy-charts";
import type { ProgressPoint } from "@/components/charts/progress-line-chart";
import { formatDateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { metricSeries } from "../calculations";
import { formatMetric, METRICS, type Measurement, type MetricKey } from "../constants";

/** One measurement over time. Only metrics you have logged are offered. */
export function MetricChart({ entries, from }: { entries: Measurement[]; from: string | null }) {
  const available = METRICS.filter((m) => entries.some((e) => e[m.key] !== null));
  const [selected, setSelected] = useState<MetricKey>(() =>
    available.some((m) => m.key === "weight_kg") ? "weight_kg" : (available[0]?.key ?? "weight_kg"),
  );
  const metric = METRICS.find((m) => m.key === selected)!;

  const data: ProgressPoint[] = metricSeries(entries, selected, from).map((point) => ({
    key: point.date,
    label: formatDateKey(point.date, { day: "numeric", month: "short" }),
    dateLabel: formatDateKey(point.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
    value: point.value,
    detail: "",
  }));

  return (
    <div className="grid gap-3">
      <div role="radiogroup" aria-label="Measurement" className="flex flex-wrap gap-1.5">
        {available.map((m) => (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={selected === m.key}
            onClick={() => setSelected(m.key)}
            className={cn(
              "h-11 rounded-full border px-3.5 text-xs font-medium transition-colors",
              selected === m.key ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground active:bg-secondary",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      {data.length < 2 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Log {metric.label.toLowerCase()} on at least two dates in this period to see a trend.
        </p>
      ) : (
        <ProgressLineChart
          data={data}
          seriesLabel={metric.label}
          estimated={false}
          formatValue={(v) => formatMetric(Math.round(v * 10) / 10, metric.unit)}
          caption={`${metric.label} over time`}
        />
      )}
    </div>
  );
}

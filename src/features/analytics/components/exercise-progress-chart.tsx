"use client";

import { useState } from "react";

import { LazyProgressLineChart as ProgressLineChart } from "@/components/charts/lazy-charts";
import type { ProgressPoint } from "@/components/charts/progress-line-chart";
import type { ExerciseSessionStats } from "@/features/analytics/calculations";
import { formatDateKey, toDateKey } from "@/lib/dates";
import { formatKg, formatVolume } from "@/lib/format";
import { cn } from "@/lib/utils";

type Metric = "topWeight" | "e1rm" | "volume" | "maxReps";

const METRICS: { key: Metric; label: string; estimated: boolean }[] = [
  { key: "topWeight", label: "Top set weight", estimated: false },
  { key: "e1rm", label: "Est. 1RM", estimated: true },
  { key: "volume", label: "Volume", estimated: false },
  { key: "maxReps", label: "Most reps", estimated: false },
];

function valueFor(p: ExerciseSessionStats, metric: Metric) {
  switch (metric) {
    case "topWeight":
      return p.topWeightKg;
    case "e1rm":
      return p.bestE1rmKg;
    case "volume":
      return p.volumeKg;
    case "maxReps":
      return p.maxReps;
  }
}

function formatter(metric: Metric) {
  if (metric === "maxReps") return (v: number) => `${v} reps`;
  if (metric === "volume") return (v: number) => formatVolume(v);
  return (v: number) => formatKg(Math.round(v * 10) / 10);
}

export function ExerciseProgressChart({ points, timeZone, exerciseName }: { points: ExerciseSessionStats[]; timeZone: string; exerciseName: string }) {
  const [metric, setMetric] = useState<Metric>("topWeight");
  const config = METRICS.find((m) => m.key === metric)!;

  const data: ProgressPoint[] = points.map((p) => {
    const key = toDateKey(p.startedAt, timeZone);
    return {
      key: p.sessionId,
      label: formatDateKey(key, { day: "numeric", month: "short" }),
      dateLabel: formatDateKey(key, { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
      value: valueFor(p, metric),
      detail: `${formatKg(p.topWeightKg)} × ${p.topWeightReps}`,
    };
  });

  return (
    <div className="grid gap-3">
      <div role="radiogroup" aria-label="Chart metric" className="-mx-1 flex flex-wrap gap-1.5 px-1">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={metric === m.key}
            onClick={() => setMetric(m.key)}
            className={cn(
              "h-9 rounded-full border px-3.5 text-xs font-medium transition-colors",
              metric === m.key ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      {config.estimated ? (
        <p className="text-xs text-muted-foreground">
          Estimated with the Epley formula from sets of 1–12 reps. Dashed line = estimate, not a lift you performed.
        </p>
      ) : null}
      {data.length < 2 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Log this exercise in at least two sessions in this period to see a trend.
        </p>
      ) : (
        <ProgressLineChart
          data={data}
          seriesLabel={config.label}
          detailLabel="Top set"
          estimated={config.estimated}
          formatValue={formatter(metric)}
          caption={`${exerciseName}: ${config.label} per session`}
        />
      )}
    </div>
  );
}

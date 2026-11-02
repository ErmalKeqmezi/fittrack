"use client";

import { useId, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { chartTheme } from "@/components/charts/chart-theme";
import { ChartTooltipCard } from "@/components/charts/chart-tooltip";
import type { WeekBucket } from "@/features/analytics/calculations";
import { addDays, formatDateKey } from "@/lib/dates";
import { formatInteger, formatVolume } from "@/lib/format";
import { cn } from "@/lib/utils";

type Metric = "volumeKg" | "workouts";

const METRICS: { key: Metric; label: string }[] = [
  { key: "volumeKg", label: "Volume" },
  { key: "workouts", label: "Workouts" },
];

function weekLabel(weekStart: string) {
  return formatDateKey(weekStart, { day: "numeric", month: "short" });
}

function weekRange(weekStart: string) {
  return `${weekLabel(weekStart)} – ${formatDateKey(addDays(weekStart, 6), { day: "numeric", month: "short" })}`;
}

function formatMetric(metric: Metric, value: number) {
  return metric === "volumeKg" ? formatVolume(value) : formatInteger(value);
}

/** Weekly volume or workout count for the last weeks. One measure at a time: no dual axis. */
export function WeeklyActivityChart({ buckets }: { buckets: WeekBucket[] }) {
  const [metric, setMetric] = useState<Metric>("volumeKg");
  const tableId = useId();
  const currentWeek = buckets.at(-1)?.weekStart;

  return (
    <div>
      <div role="radiogroup" aria-label="Chart metric" className="mb-3 inline-flex rounded-xl border border-border bg-secondary p-1">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={metric === m.key}
            onClick={() => setMetric(m.key)}
            className={cn(
              "h-8 rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors",
              metric === m.key && "bg-card text-foreground shadow-sm",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="h-44 sm:h-56" aria-describedby={tableId}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={buckets} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke={chartTheme.grid} strokeDasharray="0" />
            <XAxis
              dataKey="weekStart"
              tickFormatter={weekLabel}
              tickLine={false}
              axisLine={false}
              tick={{ fill: chartTheme.axisText, fontSize: chartTheme.fontSize }}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              allowDecimals={metric === "volumeKg"}
              tick={{ fill: chartTheme.axisText, fontSize: chartTheme.fontSize }}
              tickFormatter={(v: number) => (metric === "volumeKg" ? formatVolume(v).replace(" kg", "") : String(v))}
            />
            <Tooltip
              cursor={{ fill: chartTheme.cursor, radius: 6 }}
              content={({ active, payload }) => {
                const bucket = payload?.[0]?.payload as WeekBucket | undefined;
                if (!active || !bucket) return null;
                return (
                  <ChartTooltipCard
                    title={`${weekRange(bucket.weekStart)}${bucket.weekStart === currentWeek ? " (this week)" : ""}`}
                    rows={[
                      { label: "Workouts", value: formatInteger(bucket.workouts) },
                      { label: "Volume", value: formatVolume(bucket.volumeKg) },
                    ]}
                  />
                );
              }}
            />
            <Bar
              dataKey={metric}
              fill={chartTheme.series}
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table id={tableId} className="sr-only">
        <caption>Weekly training activity</caption>
        <thead>
          <tr>
            <th scope="col">Week</th>
            <th scope="col">Workouts</th>
            <th scope="col">Volume</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.weekStart}>
              <th scope="row">{weekRange(b.weekStart)}</th>
              <td>{b.workouts}</td>
              <td>{formatMetric("volumeKg", b.volumeKg)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

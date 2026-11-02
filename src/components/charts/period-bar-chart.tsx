"use client";

import { useId, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatInteger, formatVolume } from "@/lib/format";
import { cn } from "@/lib/utils";

import { chartTheme } from "./chart-theme";
import { ChartTooltipCard } from "./chart-tooltip";

export type PeriodBar = {
  key: string;
  /** Short axis label, e.g. "12 Oct" or "Oct". */
  label: string;
  /** Full label for tooltips and the table, e.g. "12 Oct – 18 Oct". */
  rangeLabel: string;
  workouts: number;
  volumeKg: number;
  current?: boolean;
};

type Metric = "volumeKg" | "workouts";

const METRICS: { key: Metric; label: string }[] = [
  { key: "volumeKg", label: "Volume" },
  { key: "workouts", label: "Workouts" },
];

/** Volume or workout count per period. One measure at a time: never a dual axis. */
export function PeriodBarChart({ data, caption, heightClass = "h-44 sm:h-56" }: { data: PeriodBar[]; caption: string; heightClass?: string }) {
  const [metric, setMetric] = useState<Metric>("volumeKg");
  const tableId = useId();

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
            className={cn("h-8 rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors", metric === m.key && "bg-card text-foreground shadow-sm")}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className={heightClass} aria-describedby={tableId}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke={chartTheme.grid} />
            <XAxis
              dataKey="label"
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
                const bar = payload?.[0]?.payload as PeriodBar | undefined;
                if (!active || !bar) return null;
                return (
                  <ChartTooltipCard
                    title={`${bar.rangeLabel}${bar.current ? " (current)" : ""}`}
                    rows={[
                      { label: "Workouts", value: formatInteger(bar.workouts) },
                      { label: "Volume", value: formatVolume(bar.volumeKg) },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey={metric} fill={chartTheme.series} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table id={tableId} className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Workouts</th>
            <th scope="col">Volume</th>
          </tr>
        </thead>
        <tbody>
          {data.map((b) => (
            <tr key={b.key}>
              <th scope="row">{b.rangeLabel}</th>
              <td>{b.workouts}</td>
              <td>{formatVolume(b.volumeKg)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

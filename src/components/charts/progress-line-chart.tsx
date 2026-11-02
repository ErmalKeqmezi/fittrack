"use client";

import { useId } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { chartTheme } from "./chart-theme";
import { ChartTooltipCard } from "./chart-tooltip";

export type ProgressPoint = {
  key: string;
  label: string;
  dateLabel: string;
  value: number | null;
  detail: string;
};

/**
 * One measure over sessions. Estimated series are drawn dashed and named as
 * estimates so they are never mistaken for recorded performance.
 */
export function ProgressLineChart({
  data,
  seriesLabel,
  estimated,
  formatValue,
  caption,
}: {
  data: ProgressPoint[];
  seriesLabel: string;
  estimated: boolean;
  formatValue: (value: number) => string;
  caption: string;
}) {
  const tableId = useId();
  const values = data.map((d) => d.value).filter((v): v is number => v !== null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.15, max * 0.02, 1);

  return (
    <div>
      <div className="h-56 sm:h-72" aria-describedby={tableId}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={chartTheme.grid} />
            <XAxis
              dataKey="key"
              tickFormatter={(key: string) => data.find((d) => d.key === key)?.label ?? ""}
              tickLine={false}
              axisLine={false}
              tick={{ fill: chartTheme.axisText, fontSize: chartTheme.fontSize }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              width={48}
              tickLine={false}
              axisLine={false}
              domain={values.length ? [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)] : [0, 1]}
              tick={{ fill: chartTheme.axisText, fontSize: chartTheme.fontSize }}
              tickFormatter={(v: number) => formatValue(v).replace(/ kg$/, "")}
            />
            <Tooltip
              cursor={{ stroke: chartTheme.axisText, strokeWidth: 1, strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as ProgressPoint | undefined;
                if (!active || !point || point.value === null) return null;
                return (
                  <ChartTooltipCard
                    title={point.dateLabel}
                    rows={[
                      { label: seriesLabel, value: formatValue(point.value), swatch: chartTheme.series },
                      { label: "Top set", value: point.detail },
                    ]}
                  />
                );
              }}
            />
            <Line
              type="linear"
              dataKey="value"
              name={seriesLabel}
              stroke={chartTheme.series}
              strokeWidth={2}
              strokeDasharray={estimated ? "6 4" : undefined}
              connectNulls
              dot={{ r: 4, fill: chartTheme.series, stroke: "var(--card)", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: chartTheme.series, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table id={tableId} className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">{seriesLabel}</th>
            <th scope="col">Top set</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.dateLabel}</th>
              <td>{d.value === null ? "—" : formatValue(d.value)}</td>
              <td>{d.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

/** Tooltip body for Recharts: title plus label/value rows, text in text tokens. */
export function ChartTooltipCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string; swatch?: string }[];
}) {
  return (
    <div className="min-w-40 rounded-xl border border-border bg-popover px-3 py-2.5 text-xs shadow-xl shadow-black/40">
      <p className="mb-1.5 font-medium text-foreground">{title}</p>
      <dl className="grid gap-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              {row.swatch ? <span className="size-2 rounded-sm" style={{ background: row.swatch }} /> : null}
              {row.label}
            </dt>
            <dd className="font-medium text-foreground tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

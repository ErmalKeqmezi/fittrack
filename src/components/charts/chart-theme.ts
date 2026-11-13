/** Shared Recharts styling from the design tokens: mono axis labels, quiet grid, one accent. */
export const chartTheme = {
  series: "var(--chart-1)",
  seriesMuted: "color-mix(in oklab, var(--chart-1) 45%, var(--background))",
  grid: "color-mix(in oklab, var(--border) 70%, transparent)",
  axisText: "var(--faint)",
  fontFamily: "var(--font-mono)",
  cursor: "color-mix(in oklab, var(--foreground) 6%, transparent)",
  fontSize: 11,
} as const;

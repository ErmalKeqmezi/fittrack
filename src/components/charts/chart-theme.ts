/** Shared Recharts styling, derived from the FitTrack palette (validated against #1A1A22). */
export const chartTheme = {
  series: "var(--chart-1)",
  seriesMuted: "color-mix(in oklab, var(--chart-1) 55%, var(--card))",
  grid: "var(--border)",
  axisText: "var(--muted-foreground)",
  cursor: "color-mix(in oklab, var(--foreground) 6%, transparent)",
  fontSize: 11,
} as const;

import { StatStrip } from "@/components/stat-strip";
import { formatInteger, formatVolume } from "@/lib/format";

import type { DashboardData } from "../queries";

export function StatsGrid({ stats }: { stats: DashboardData["stats"] }) {
  const weekDelta = stats.workoutsThisWeek - stats.workoutsLastWeek;

  return (
    <StatStrip
      stats={[
        { label: "Completed workouts", value: formatInteger(stats.totalWorkouts), hint: "All time" },
        {
          label: "This week",
          value: formatInteger(stats.workoutsThisWeek),
          hint:
            stats.workoutsLastWeek || stats.workoutsThisWeek
              ? `${weekDelta >= 0 ? "+" : "−"}${Math.abs(weekDelta)} vs last week (${stats.workoutsLastWeek})`
              : "No workouts last week",
        },
        { label: "Total volume", value: formatVolume(stats.totalVolumeKg), hint: `${formatVolume(stats.volumeThisWeekKg)} this week` },
        { label: "Personal records", value: formatInteger(stats.personalRecords), hint: "Weight, reps & est. 1RM", accent: stats.personalRecords > 0 },
      ]}
    />
  );
}

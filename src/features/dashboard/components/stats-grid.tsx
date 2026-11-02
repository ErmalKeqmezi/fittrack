import { CalendarCheck, Dumbbell, Trophy, Weight } from "lucide-react";

import { formatInteger, formatVolume } from "@/lib/format";

import type { DashboardData } from "../queries";
import { StatCard } from "./stat-card";

export function StatsGrid({ stats }: { stats: DashboardData["stats"] }) {
  const weekDelta = stats.workoutsThisWeek - stats.workoutsLastWeek;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard
        label="Completed workouts"
        value={formatInteger(stats.totalWorkouts)}
        detail="All time"
        icon={Dumbbell}
      />
      <StatCard
        label="This week"
        value={formatInteger(stats.workoutsThisWeek)}
        detail={
          stats.workoutsLastWeek || stats.workoutsThisWeek
            ? `${weekDelta >= 0 ? "+" : "−"}${Math.abs(weekDelta)} vs last week (${stats.workoutsLastWeek})`
            : "No workouts last week"
        }
        icon={CalendarCheck}
      />
      <StatCard
        label="Total volume"
        value={formatVolume(stats.totalVolumeKg)}
        detail={`${formatVolume(stats.volumeThisWeekKg)} this week`}
        icon={Weight}
      />
      <StatCard
        label="Personal records"
        value={formatInteger(stats.personalRecords)}
        detail="Weight, reps & est. 1RM"
        icon={Trophy}
      />
    </div>
  );
}

import type { Metadata } from "next";

import { requireUser } from "@/features/auth/queries";
import { ProgressHighlights } from "@/features/dashboard/components/progress-highlights";
import { RecentWorkouts } from "@/features/dashboard/components/recent-workouts";
import { StatsGrid } from "@/features/dashboard/components/stats-grid";
import { TodayWorkoutCard } from "@/features/dashboard/components/today-workout-card";
import { WeeklyActivity } from "@/features/dashboard/components/weekly-activity";
import { getDashboardData } from "@/features/dashboard/queries";
import { getInProgressWorkout } from "@/features/workouts/queries";

export const metadata: Metadata = { title: "Dashboard" };

function greeting(timeZone: string) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date()));
  if (hour < 5) return "Late session";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [data, inProgress] = await Promise.all([getDashboardData(user), getInProgressWorkout()]);

  const hello = `${greeting(user.timeZone)}${user.displayName ? `, ${user.displayName}` : ""}`;

  return (
    <div className="grid gap-9 lg:gap-12">
      {/* Lead: what to do today, beside this week's activity. */}
      <div className="grid gap-9 xl:grid-cols-12 xl:gap-12">
        <div className="xl:col-span-7">
          <TodayWorkoutCard schedule={data.todaySchedule} today={data.today} inProgress={inProgress} greeting={hello} />
        </div>
        <div className="xl:col-span-5">
          <WeeklyActivity data={data} />
        </div>
      </div>

      <StatsGrid stats={data.stats} />

      <div className="grid gap-9 xl:grid-cols-12 xl:gap-12">
        <div className="xl:col-span-7">
          <RecentWorkouts workouts={data.recentWorkouts} timeZone={data.timeZone} />
        </div>
        <div className="xl:col-span-5">
          <ProgressHighlights data={data} />
        </div>
      </div>
    </div>
  );
}

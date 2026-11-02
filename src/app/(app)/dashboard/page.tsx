import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/features/auth/queries";
import { ProgressHighlights } from "@/features/dashboard/components/progress-highlights";
import { RecentWorkouts } from "@/features/dashboard/components/recent-workouts";
import { StatsGrid } from "@/features/dashboard/components/stats-grid";
import { TodayWorkoutCard } from "@/features/dashboard/components/today-workout-card";
import { WeeklyActivity } from "@/features/dashboard/components/weekly-activity";
import { getDashboardData } from "@/features/dashboard/queries";

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
  const data = await getDashboardData(user);

  return (
    <div className="grid gap-5 lg:gap-6">
      <PageHeader
        title={`${greeting(user.timeZone)}${user.displayName ? `, ${user.displayName}` : ""}`}
        description="Your training at a glance"
      />

      {/* Phones and tablets put today's workout first; wide screens lead with the stats row. */}
      <div className="grid gap-4 lg:gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <TodayWorkoutCard schedule={data.todaySchedule} today={data.today} />
        </div>
        <div className="xl:order-first xl:col-span-12">
          <StatsGrid stats={data.stats} />
        </div>
        <div className="xl:col-span-7">
          <WeeklyActivity data={data} />
        </div>
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

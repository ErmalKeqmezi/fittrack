import type { Metadata } from "next";

import { requireUser } from "@/features/auth/queries";
import { ProgressHighlights } from "@/features/dashboard/components/progress-highlights";
import { RecentWorkouts } from "@/features/dashboard/components/recent-workouts";
import { StatsGrid } from "@/features/dashboard/components/stats-grid";
import { TodayWorkoutCard } from "@/features/dashboard/components/today-workout-card";
import { routes } from "@/config/routes";
import { MonthActivityLog } from "@/features/activity/components/month-activity-log";
import { monthActivity, monthKey, parseMonthKey, shiftMonth } from "@/features/activity/month-activity";
import { getTrainingDays } from "@/features/activity/queries";
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

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser();
  const [data, inProgress] = await Promise.all([getDashboardData(user), getInProgressWorkout()]);

  // Monthly activity: this month unless ?month=YYYY-MM picks an earlier one.
  const current = { year: Number(data.today.slice(0, 4)), month: Number(data.today.slice(5, 7)) };
  const currentKey = monthKey(current.year, current.month);
  const asked = parseMonthKey((await searchParams).month);
  const shown = asked && monthKey(asked.year, asked.month) <= currentKey ? asked : current;
  const training = await getTrainingDays(shown.year, shown.month, user.timeZone);
  const shownKey = monthKey(shown.year, shown.month);
  const firstKey = training.firstMonth && training.firstMonth < currentKey ? training.firstMonth : currentKey;
  const hrefFor = (by: number) => {
    const target = shiftMonth(shown, by);
    const key = monthKey(target.year, target.month);
    if (key < firstKey || key > currentKey) return null;
    return key === currentKey ? routes.dashboard : `${routes.dashboard}?month=${key}`;
  };
  const activity = monthActivity(shown.year, shown.month, training.days, data.today);

  const hello = `${greeting(user.timeZone)}${user.displayName ? `, ${user.displayName}` : ""}`;

  return (
    <div className="grid gap-9 lg:gap-12">
      {/* Lead: what to do today, beside this month's activity. */}
      <div className="grid gap-9 xl:grid-cols-12 xl:gap-12">
        <div className="xl:col-span-7">
          <TodayWorkoutCard schedule={data.todaySchedule} today={data.today} inProgress={inProgress} greeting={hello} />
        </div>
        <div className="xl:col-span-5">
          <MonthActivityLog key={shownKey} activity={activity} previousHref={hrefFor(-1)} nextHref={hrefFor(1)} />
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

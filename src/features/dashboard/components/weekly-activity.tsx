import { Activity, BarChart3 } from "lucide-react";

import { EmptyState, Panel, PanelHeader } from "@/components/panel";

import type { DashboardData } from "../queries";
import { WeeklyActivityChart } from "./weekly-activity-chart";
import { WeekStrip } from "./week-strip";

export function WeeklyActivity({ data }: { data: DashboardData }) {
  const hasHistory = data.weeklyBuckets.some((b) => b.workouts > 0);
  const trainedDays = data.weekDays.filter((d) => d.workouts > 0).length;

  return (
    <Panel className="h-full">
      <PanelHeader
        title="Weekly activity"
        description={`${trainedDays} of 7 days trained this week`}
        icon={Activity}
      />
      <WeekStrip days={data.weekDays} />
      <div className="mt-6 border-t border-border pt-5">
        <p className="mb-3 text-xs font-medium text-muted-foreground">Last {data.weeklyBuckets.length} weeks</p>
        {hasHistory ? (
          <WeeklyActivityChart buckets={data.weeklyBuckets} />
        ) : (
          <EmptyState icon={BarChart3} title="No completed workouts in this period">
            Weekly volume and workout counts appear here as you finish workouts.
          </EmptyState>
        )}
      </div>
    </Panel>
  );
}

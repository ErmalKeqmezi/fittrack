import { CalendarCheck, ChevronRight, Clock, Dumbbell, LineChart, Trophy, Weight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { LazyPeriodBarChart as PeriodBarChart } from "@/components/charts/lazy-charts";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, Panel, PanelHeader } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { parseRange, RANGE_LABELS } from "@/features/analytics/calculations";
import { monthlyBars, weeklyBars } from "@/features/analytics/chart-data";
import { ChangeBadge } from "@/features/analytics/components/change-badge";
import { RangeTabs } from "@/features/analytics/components/range-tabs";
import { getProgressOverview } from "@/features/analytics/queries";
import { requireUser } from "@/features/auth/queries";
import { formatDuration, formatInteger, formatKg, formatVolume } from "@/lib/format";

export const metadata: Metadata = { title: "Progress" };

export default async function ProgressPage({ searchParams }: PageProps<"/progress">) {
  const range = parseRange((await searchParams).range);
  const user = await requireUser();
  const data = await getProgressOverview(user, range);
  const vsLabel = range === "all" ? null : `vs previous ${RANGE_LABELS[range].toLowerCase()}`;

  const stats = [
    { icon: CalendarCheck, label: "Workouts", value: formatInteger(data.totals.workouts), change: data.changes?.workouts ?? null },
    { icon: Weight, label: "Volume", value: formatVolume(data.totals.volumeKg), change: data.changes?.volumeKg ?? null },
    { icon: Dumbbell, label: "Working sets", value: formatInteger(data.totals.workingSets), change: data.changes?.workingSets ?? null },
    { icon: Clock, label: "Avg. duration", value: formatDuration(data.totals.avgDurationMinutes), change: undefined },
  ];

  return (
    <div className="grid gap-5 lg:gap-6">
      <PageHeader
        title="Progress"
        description="Calculated from your logged sets. Estimates are labelled."
        actions={
          <Button asChild variant="outline" className="h-11 rounded-xl px-4">
            <Link href={routes.records}>
              <Trophy aria-hidden /> Personal records ({data.personalRecords})
            </Link>
          </Button>
        }
      />
      <RangeTabs pathname={routes.progress} current={range} />

      {!data.hasAnyWorkouts ? (
        <EmptyState icon={LineChart} title="No workouts logged yet">
          Finish your first workout to see volume, trends and exercise progression here.
        </EmptyState>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {stats.map(({ icon: Icon, label, value, change }) => (
              <div key={label} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <dt className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground sm:text-sm">
                  {label} <Icon className="size-4 text-primary" aria-hidden />
                </dt>
                <dd className="mt-2 text-2xl font-semibold tracking-tight whitespace-nowrap tabular-nums sm:text-3xl lg:text-2xl xl:text-3xl">{value}</dd>
                {change !== undefined && vsLabel ? (
                  <dd className="mt-1 flex flex-wrap items-center gap-1">
                    <ChangeBadge value={change} unit="%" />
                    <span className="text-xs text-muted-foreground">{change === null ? "" : vsLabel}</span>
                  </dd>
                ) : null}
              </div>
            ))}
          </dl>

          <div className="grid gap-4 xl:grid-cols-2 xl:gap-6">
            <Panel>
              <PanelHeader title="Weekly volume" description="Last 12 weeks, Monday to Sunday" />
              <PeriodBarChart data={weeklyBars(data.weekly)} caption="Weekly training volume" />
            </Panel>
            <Panel>
              <PanelHeader title="Monthly volume" description="Last 12 months" />
              <PeriodBarChart data={monthlyBars(data.monthly)} caption="Monthly training volume" />
            </Panel>
          </div>

          <Panel className="p-0 sm:p-0">
            <div className="p-4 pb-3 sm:px-5">
              <PanelHeader
                title="Exercises"
                description={range === "all" ? "Everything you have logged" : `Trained in the last ${RANGE_LABELS[range].toLowerCase()}`}
              />
            </div>
            {data.exercises.length === 0 ? (
              <p className="px-4 pb-5 text-sm text-muted-foreground sm:px-5">No exercises logged in this period.</p>
            ) : (
              <>
              <div
                aria-hidden
                className="hidden grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_1rem] gap-x-3 border-t border-border px-5 py-2 text-xs font-medium text-muted-foreground sm:grid"
              >
                <span>Exercise</span>
                <span>Top set (actual)</span>
                <span>Est. 1RM</span>
                <span>Change</span>
                <span />
              </div>
              <ul className="divide-y divide-border border-t border-border">
                {data.exercises.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`${routes.progress}/exercises/${e.id}?range=${range}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-secondary/50 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_1rem] sm:px-5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{e.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {e.sessions} {e.sessions === 1 ? "session" : "sessions"} · {formatVolume(e.volumeKg)}
                        </span>
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground sm:order-last" aria-hidden />
                      <span className="col-span-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs sm:contents">
                        <span className="text-muted-foreground sm:text-sm">
                          <span className="sm:hidden">Top set </span>
                          <span className="font-medium text-foreground tabular-nums">
                            {e.bestTopSet ? `${formatKg(e.bestTopSet.weightKg)} × ${e.bestTopSet.reps}` : "—"}
                          </span>
                        </span>
                        <span className="text-muted-foreground sm:text-sm">
                          <span className="sm:hidden">Est. 1RM </span>
                          <span className="tabular-nums">{e.bestE1rmKg !== null ? formatKg(e.bestE1rmKg) : "—"}</span>
                        </span>
                        <span>
                          <ChangeBadge value={e.e1rmChangeKg ?? e.topWeightChangeKg} unit="kg" />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              </>
            )}
            {data.exercises.length ? (
              <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-5">
                Top set = heaviest recorded set. Est. 1RM is an Epley estimate (1–12 reps). Change = first vs last session in the period.
              </p>
            ) : null}
          </Panel>
        </>
      )}
    </div>
  );
}

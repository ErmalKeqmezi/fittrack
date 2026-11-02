import { BedDouble, CalendarDays, ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelHeader } from "@/components/panel";
import { routes } from "@/config/routes";
import { requireUser } from "@/features/auth/queries";
import { formatTargets, WEEKDAY_LABELS, type Weekday } from "@/features/planner/constants";
import { listPlans } from "@/features/planner/queries";
import type { Plan } from "@/features/planner/types";
import { StartWorkoutButton } from "@/features/workouts/components/start-workout-button";
import { getInProgressWorkout } from "@/features/workouts/queries";
import { isoWeekday, toDateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Start workout" };

export default async function StartWorkoutPage() {
  const [user, inProgress, plans] = await Promise.all([requireUser(), getInProgressWorkout(), listPlans()]);
  if (inProgress) redirect(`${routes.workouts}/${inProgress.id}`);

  const today = isoWeekday(toDateKey(new Date(), user.timeZone));
  const active = plans.find((p) => p.isActive) ?? null;
  const others = plans.filter((p) => !p.isActive);
  const todayDay = active?.days.find((d) => d.weekday === today) ?? null;

  return (
    <div className="grid gap-5 lg:gap-6">
      <PageHeader title="Start a workout" description="Pick a planned day or start empty and add exercises as you go." />

      {todayDay && !todayDay.isRestDay ? (
        <Panel className="border-primary/40">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-soft">Today · {WEEKDAY_LABELS[today as Weekday]}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{todayDay.name}</h2>
          <p className="text-sm text-muted-foreground">
            {active!.name} · {todayDay.exercises.length} exercises
          </p>
          <ul className="mt-3 grid gap-1 text-sm text-muted-foreground">
            {todayDay.exercises.slice(0, 6).map((e) => (
              <li key={e.id} className="flex justify-between gap-3">
                <span className="truncate">{e.exercise.name}</span>
                <span className="shrink-0 tabular-nums">{formatTargets(e.targetSets, e.targetRepsMin, e.targetRepsMax)}</span>
              </li>
            ))}
            {todayDay.exercises.length > 6 ? <li>+{todayDay.exercises.length - 6} more</li> : null}
          </ul>
          <StartWorkoutButton dayId={todayDay.id} className="mt-4 w-full sm:w-auto">
            Start {todayDay.name}
          </StartWorkoutButton>
        </Panel>
      ) : todayDay?.isRestDay ? (
        <Panel className="flex items-center gap-3 text-sm text-muted-foreground">
          <BedDouble className="size-5" aria-hidden /> Today is a rest day in {active!.name}. You can still train below.
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader title="Empty workout" description="Add exercises freely. No plan needed." icon={ClipboardList} />
        <StartWorkoutButton dayId={null} variant="outline" className="w-full sm:w-auto">
          Start empty workout
        </StartWorkoutButton>
      </Panel>

      {active ? <PlanDays plan={active} title={`${active.name} (active)`} highlightId={todayDay?.id} /> : null}
      {others.map((plan) => (
        <PlanDays key={plan.id} plan={plan} title={plan.name} />
      ))}

      {!plans.length ? (
        <p className="text-sm text-muted-foreground">
          No plans yet.{" "}
          <Link href={routes.plans} className="font-medium text-primary hover:underline">
            Create one
          </Link>{" "}
          to start from a planned day.
        </p>
      ) : null}
    </div>
  );
}

function PlanDays({ plan, title, highlightId }: { plan: Plan; title: string; highlightId?: string }) {
  const days = plan.days.filter((d) => !d.isRestDay && d.exercises.length);
  if (!days.length) return null;

  return (
    <Panel>
      <PanelHeader title={title} description="Start any day, any time." icon={CalendarDays} />
      <ul className="grid gap-2 sm:grid-cols-2">
        {days.map((day) => (
          <li
            key={day.id}
            className={cn("flex items-center gap-3 rounded-xl border p-3", day.id === highlightId ? "border-primary/40 bg-accent/40" : "border-border")}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{day.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {day.weekday ? WEEKDAY_LABELS[day.weekday as Weekday] : "Unscheduled"} · {day.exercises.length} exercises
              </p>
            </div>
            <StartWorkoutButton dayId={day.id} variant="secondary" className="h-10 px-3 text-sm">
              Start
            </StartWorkoutButton>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

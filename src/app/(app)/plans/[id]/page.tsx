import { CalendarDays, CircleCheck, Plus } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/layout/back-link";
import { EmptyState } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { listExercises } from "@/features/exercises/queries";
import { ActivePlanToggle } from "@/features/planner/components/active-plan-toggle";
import { DayCard } from "@/features/planner/components/day-card";
import { DayDialog } from "@/features/planner/components/day-dialog";
import { PlanActions } from "@/features/planner/components/plan-actions";
import { WeekSchedule } from "@/features/planner/components/week-schedule";
import { MAX_DAYS_PER_PLAN } from "@/features/planner/constants";
import { getPlan } from "@/features/planner/queries";
import { isUuid } from "@/lib/uuid";

export async function generateMetadata({ params }: PageProps<"/plans/[id]">): Promise<Metadata> {
  const { id } = await params;
  const plan = isUuid(id) ? await getPlan(id) : null;
  return { title: plan?.name ?? "Plan" };
}

export default async function PlanEditorPage({ params }: PageProps<"/plans/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [plan, exercises] = await Promise.all([getPlan(id), listExercises()]);
  if (!plan) notFound();

  const library = exercises.filter((e) => !e.isArchived);
  const takenWeekdays = new Map(plan.days.filter((d) => d.weekday).map((d) => [d.weekday!, d.name]));
  const canAddDay = plan.days.length < MAX_DAYS_PER_PLAN;

  return (
    <div className="grid gap-5 lg:gap-6">
      <BackLink href={routes.plans}>Workout plans</BackLink>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 text-[2.5rem] leading-[0.95] font-bold break-words lg:text-6xl">{plan.name}</h1>
            {plan.isActive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-brand-soft">
                <CircleCheck className="size-3.5" aria-hidden /> Active
              </span>
            ) : null}
          </div>
          {plan.description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{plan.description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <ActivePlanToggle planId={plan.id} isActive={plan.isActive} />
          <PlanActions planId={plan.id} name={plan.name} description={plan.description} />
        </div>
      </div>

      <section aria-labelledby="schedule-heading" className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 id="schedule-heading" className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="size-4 text-primary" aria-hidden /> Weekly schedule
        </h2>
        <WeekSchedule days={plan.days} />
        {!plan.isActive ? (
          <p className="text-xs text-muted-foreground">Activate this plan to see its scheduled day on the dashboard.</p>
        ) : null}
      </section>

      <section aria-labelledby="days-heading" className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="days-heading" className="text-lg font-semibold">
            Days <span className="text-sm font-normal text-muted-foreground">({plan.days.length})</span>
          </h2>
          <DayDialog
            mode="add"
            planId={plan.id}
            takenWeekdays={takenWeekdays}
            trigger={
              <Button className="h-11 rounded-xl px-4" disabled={!canAddDay}>
                <Plus aria-hidden /> Add day
              </Button>
            }
          />
        </div>
        {plan.days.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {plan.days.map((day, i) => (
              <DayCard
                key={day.id}
                day={day}
                index={i}
                isFirst={i === 0}
                isLast={i === plan.days.length - 1}
                takenWeekdays={takenWeekdays}
                library={library}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={CalendarDays} title="No days yet">
            Add training days (and rest days if you like), then assign exercises with target sets and reps.
          </EmptyState>
        )}
        {!canAddDay ? <p className="text-xs text-muted-foreground">Plans can have up to {MAX_DAYS_PER_PLAN} days.</p> : null}
      </section>
    </div>
  );
}

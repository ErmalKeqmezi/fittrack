import { BedDouble, CalendarClock, CalendarDays, CheckCircle2, ClipboardList, Play } from "lucide-react";
import Link from "next/link";

import { EmptyState, Panel, PanelHeader } from "@/components/panel";
import { routes } from "@/config/routes";
import { Button } from "@/components/ui/button";
import { StartWorkoutButton } from "@/features/workouts/components/start-workout-button";
import type { InProgressWorkout } from "@/features/workouts/queries";
import { formatDateKey } from "@/lib/dates";

import type { TodaySchedule } from "../today";

const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function repRange(min: number, max: number) {
  return min === max ? `${min}` : `${min}–${max}`;
}

/** Only one workout runs at a time, so while one is open this resumes it rather than starting another. */
function ResumeButton({ workout, className }: { workout: InProgressWorkout; className?: string }) {
  return (
    <Button asChild className={`h-12 rounded-xl px-5 text-base font-semibold ${className ?? ""}`}>
      <Link href={`${routes.workouts}/${workout.id}`}>
        <Play aria-hidden /> Resume {workout.name}
      </Link>
    </Button>
  );
}

export function TodayWorkoutCard({
  schedule,
  today,
  inProgress = null,
}: {
  schedule: TodaySchedule;
  today: string;
  inProgress?: InProgressWorkout | null;
}) {
  const dateLabel = formatDateKey(today, { weekday: "long", day: "numeric", month: "long" });

  return (
    <Panel className="h-full">
      <PanelHeader
        title="Today's workout"
        description={dateLabel}
        icon={CalendarDays}
        action={
          schedule.kind === "workout" && schedule.completedToday ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-brand-soft">
              <CheckCircle2 className="size-3.5" aria-hidden /> Done
            </span>
          ) : null
        }
      />

      {schedule.kind === "no-plan" ? (
        <EmptyState icon={ClipboardList} title="No active plan">
          When you activate a workout plan, the session scheduled for today appears here.{" "}
          <Link href={routes.plans} className="font-medium text-primary hover:underline">
            Choose a plan
          </Link>
        </EmptyState>
      ) : schedule.kind === "rest" ? (
        <EmptyState icon={BedDouble} title={`${schedule.day.name}: rest day`}>
          Recovery is part of training. {schedule.planName} has nothing scheduled today.
        </EmptyState>
      ) : schedule.kind === "unscheduled" ? (
        <EmptyState icon={CalendarClock} title="Nothing scheduled today">
          {schedule.next
            ? `Next in ${schedule.planName}: ${schedule.next.day.name} on ${WEEKDAY_NAMES[(schedule.next.day.weekday ?? 1) - 1]}${
                schedule.next.inDays === 1 ? " (tomorrow)" : ""
              }.`
            : `${schedule.planName} has no days assigned to weekdays yet.`}
        </EmptyState>
      ) : (
        <div>
          <p className="text-xl font-semibold tracking-tight">{schedule.day.name}</p>
          <p className="text-xs text-muted-foreground">{schedule.planName}</p>
          {schedule.day.exercises.length ? (
            <ol className="mt-4 divide-y divide-border rounded-xl border border-border">
              {schedule.day.exercises.map((exercise, index) => (
                <li key={exercise.id} className="flex items-center justify-between gap-3 px-3.5 py-3 text-sm">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="w-4 text-xs text-muted-foreground tabular-nums">{index + 1}</span>
                    <span className="truncate">{exercise.name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {exercise.targetSets} × {repRange(exercise.targetRepsMin, exercise.targetRepsMax)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No exercises added to this day yet.</p>
          )}
          {inProgress ? (
            <ResumeButton workout={inProgress} className="mt-4 w-full" />
          ) : !schedule.completedToday && schedule.day.exercises.length ? (
            <StartWorkoutButton dayId={schedule.day.id} className="mt-4 w-full">
              Start {schedule.day.name}
            </StartWorkoutButton>
          ) : null}
        </div>
      )}
      {schedule.kind !== "workout" && inProgress ? (
        <ResumeButton workout={inProgress} className="mt-3 w-full" />
      ) : schedule.kind !== "workout" ? (
        <Link
          href={routes.workout}
          className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border border-border text-sm font-medium text-primary transition-colors hover:bg-secondary"
        >
          Start a workout anyway
        </Link>
      ) : null}
    </Panel>
  );
}

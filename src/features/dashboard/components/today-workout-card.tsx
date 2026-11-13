import { CheckCircle2, Play } from "lucide-react";
import Link from "next/link";

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
    <Button asChild className={`cta h-14 rounded-xl px-6 text-xl ${className ?? ""}`}>
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
  greeting,
}: {
  schedule: TodaySchedule;
  today: string;
  inProgress?: InProgressWorkout | null;
  greeting?: string;
}) {
  const dateLabel = formatDateKey(today, { weekday: "long", day: "numeric", month: "long" });
  const title =
    schedule.kind === "workout"
      ? schedule.day.name
      : schedule.kind === "rest"
        ? "Rest day"
        : schedule.kind === "unscheduled"
          ? "Open day"
          : "No plan yet";

  return (
    <section>
      {greeting ? <p className="mb-5 text-sm text-muted-foreground">{greeting}</p> : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="eyebrow">Today&apos;s workout</h2>
        <span className="eyebrow text-muted-foreground">{dateLabel}</span>
        {schedule.kind === "workout" && schedule.completedToday ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
            <CheckCircle2 className="size-3.5" aria-hidden /> Done
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-display text-6xl leading-[0.9] font-bold tracking-[0.01em] break-words uppercase sm:text-7xl">{title}</p>

      {schedule.kind === "no-plan" ? (
        <p className="mt-4 max-w-md text-sm text-muted-foreground">
          When you activate a workout plan, the session scheduled for today appears here.{" "}
          <Link href={routes.plans} className="font-medium text-primary hover:underline">
            Choose a plan
          </Link>
        </p>
      ) : schedule.kind === "rest" ? (
        <p className="mt-4 max-w-md text-sm text-muted-foreground">
          {schedule.day.name}. Recovery is part of training: {schedule.planName} has nothing scheduled today.
        </p>
      ) : schedule.kind === "unscheduled" ? (
        <p className="mt-4 max-w-md text-sm text-muted-foreground">
          {schedule.next
            ? `Next in ${schedule.planName}: ${schedule.next.day.name} on ${WEEKDAY_NAMES[(schedule.next.day.weekday ?? 1) - 1]}${
                schedule.next.inDays === 1 ? " (tomorrow)" : ""
              }.`
            : `${schedule.planName} has no days assigned to weekdays yet.`}
        </p>
      ) : (
        <div>
          <p className="mt-2 text-sm text-muted-foreground">{schedule.planName}</p>
          {schedule.day.exercises.length ? (
            <ol className="mt-6 divide-y divide-border border-y border-border">
              {schedule.day.exercises.map((exercise, index) => (
                <li key={exercise.id} className="flex items-baseline justify-between gap-3 py-3 text-[15px]">
                  <span className="flex min-w-0 items-baseline gap-4">
                    <span className="w-5 shrink-0 text-xs text-faint tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                    <span className="truncate font-medium">{exercise.name}</span>
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                    {exercise.targetSets} × {repRange(exercise.targetRepsMin, exercise.targetRepsMax)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No exercises added to this day yet.</p>
          )}
          {inProgress ? (
            <ResumeButton workout={inProgress} className="mt-6 w-full sm:w-auto sm:min-w-64" />
          ) : !schedule.completedToday && schedule.day.exercises.length ? (
            <StartWorkoutButton dayId={schedule.day.id} className="mt-6 w-full sm:w-auto sm:min-w-64">
              Start {schedule.day.name}
            </StartWorkoutButton>
          ) : null}
        </div>
      )}
      {schedule.kind !== "workout" && inProgress ? (
        <ResumeButton workout={inProgress} className="mt-6 w-full sm:w-auto sm:min-w-64" />
      ) : schedule.kind !== "workout" ? (
        <Button asChild variant="outline" className="mt-6 h-12 w-full rounded-xl px-6 sm:w-auto">
          <Link href={routes.workout}>Start a workout anyway</Link>
        </Button>
      ) : null}
    </section>
  );
}

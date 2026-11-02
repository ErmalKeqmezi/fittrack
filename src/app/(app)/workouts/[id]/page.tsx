import { CalendarDays, Clock, Dumbbell, NotebookText, Weight } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/layout/back-link";
import { Panel } from "@/components/panel";
import { routes } from "@/config/routes";
import { sessionDurationMinutes } from "@/features/analytics/calculations";
import { requireUser } from "@/features/auth/queries";
import { listExercises } from "@/features/exercises/queries";
import { LoggedExercise } from "@/features/workouts/components/workout-detail";
import { WorkoutActions } from "@/features/workouts/components/workout-actions";
import { TrackerLoader } from "@/features/workouts/components/tracker-loader";
import { getPreviousPerformance, getWorkout } from "@/features/workouts/queries";
import { exerciseProgress } from "@/features/workouts/tracker-state";
import { formatDateKey, toDateKey } from "@/lib/dates";
import { formatDuration, formatVolume } from "@/lib/format";
import { isUuid } from "@/lib/uuid";

export async function generateMetadata({ params }: PageProps<"/workouts/[id]">): Promise<Metadata> {
  const { id } = await params;
  const workout = isUuid(id) ? await getWorkout(id) : null;
  return { title: workout?.state.name ?? "Workout" };
}

export default async function WorkoutPage({ params }: PageProps<"/workouts/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [user, workout] = await Promise.all([requireUser(), getWorkout(id)]);
  if (!workout) notFound();
  const { state } = workout;
  const previous = await getPreviousPerformance(
    state.exercises.map((e) => e.exerciseId),
    state.startedAt,
    state.sessionId,
  );

  if (state.status === "in_progress") {
    const library = (await listExercises()).filter((e) => !e.isArchived);
    return (
      <TrackerLoader
        initial={state}
        serverUpdatedAt={workout.updatedAt}
        previous={previous}
        library={library}
        timeZone={user.timeZone}
        planName={workout.planName}
      />
    );
  }

  const totals = state.exercises.reduce(
    (acc, e) => {
      const p = exerciseProgress(e);
      return { sets: acc.sets + p.doneSets, volume: acc.volume + p.volumeKg };
    },
    { sets: 0, volume: 0 },
  );
  const dateLabel = formatDateKey(toDateKey(state.startedAt, user.timeZone), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeLabel = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: user.timeZone }).format(new Date(state.startedAt));

  return (
    <div className="grid gap-5 lg:gap-6">
      <BackLink href={routes.history}>Workout history</BackLink>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">{state.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {dateLabel} · {timeLabel}
            {workout.planName ? ` · ${workout.planName}` : ""}
          </p>
        </div>
        <WorkoutActions sessionId={state.sessionId} name={state.name} />
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Clock, label: "Duration", value: formatDuration(sessionDurationMinutes({ startedAt: state.startedAt, endedAt: state.endedAt })) },
          { icon: Dumbbell, label: "Exercises", value: String(state.exercises.length) },
          { icon: CalendarDays, label: "Working sets", value: String(totals.sets) },
          { icon: Weight, label: "Volume", value: formatVolume(Math.round(totals.volume)) },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className="size-3.5 text-primary" aria-hidden /> {label}
            </dt>
            <dd className="mt-1.5 text-xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {state.notes ? (
        <Panel className="flex gap-3 text-sm">
          <NotebookText className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <p className="whitespace-pre-line text-foreground/90">{state.notes}</p>
        </Panel>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
        {state.exercises.map((exercise) => (
          <LoggedExercise key={exercise.id} exercise={exercise} previous={previous[exercise.exerciseId]} timeZone={user.timeZone} />
        ))}
      </div>
    </div>
  );
}

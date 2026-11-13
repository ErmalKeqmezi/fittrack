import { FileText, LayoutDashboard } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/layout/back-link";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { requireUser } from "@/features/auth/queries";
import { listExercises } from "@/features/exercises/queries";
import { RepeatWorkoutButton } from "@/features/workouts/components/summary/repeat-workout-button";
import { SessionNotes } from "@/features/workouts/components/summary/session-notes";
import {
  CompletionHeader,
  ExerciseBreakdown,
  MuscleWork,
  PersonalRecords,
  PreviousComparison,
  SummaryStats,
  WorkoutHighlights,
} from "@/features/workouts/components/summary/workout-summary";
import { TrackerLoader } from "@/features/workouts/components/tracker-loader";
import { WorkoutActions } from "@/features/workouts/components/workout-actions";
import { getPreviousPerformance, getWorkout, getWorkoutSummary } from "@/features/workouts/queries";
import { formatDateKey, toDateKey } from "@/lib/dates";
import { isUuid } from "@/lib/uuid";

export async function generateMetadata({ params }: PageProps<"/workouts/[id]">): Promise<Metadata> {
  const { id } = await params;
  const workout = isUuid(id) ? await getWorkout(id) : null;
  return { title: workout?.state.name ?? "Workout" };
}

export default async function WorkoutPage({ params, searchParams }: PageProps<"/workouts/[id]">) {
  const [{ id }, { completed }] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();

  const [user, workout] = await Promise.all([requireUser(), getWorkout(id)]);
  if (!workout) notFound();
  const { state } = workout;

  if (state.status === "in_progress") {
    const [previous, exercises] = await Promise.all([
      getPreviousPerformance(
        state.exercises.map((e) => e.exerciseId),
        state.startedAt,
        state.sessionId,
      ),
      listExercises(),
    ]);
    return (
      <TrackerLoader
        initial={state}
        serverUpdatedAt={workout.updatedAt}
        previous={previous}
        library={exercises.filter((e) => !e.isArchived)}
        timeZone={user.timeZone}
        planName={workout.planName}
        workoutDayId={workout.workoutDayId}
      />
    );
  }

  // The same screen serves right after finishing and from History; the URL
  // only picks the header, so refreshing the completion screen is safe.
  const justFinished = completed === "1";
  const summary = await getWorkoutSummary(workout);
  const dateLabel = formatDateKey(toDateKey(state.startedAt, user.timeZone), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeLabel = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: user.timeZone }).format(new Date(state.startedAt));
  const when = `${dateLabel} · ${timeLabel}`;
  const { recordCount } = summary.stats;
  const message = `${recordCount ? `${recordCount} new personal ${recordCount === 1 ? "record" : "records"}. ` : ""}Saved to your history.`;
  const buttonClass = "h-12 rounded-xl px-5";

  return (
    <div className="grid gap-5 lg:gap-6">
      {justFinished ? (
        <CompletionHeader name={state.name} when={when} message={message} />
      ) : (
        <>
          <BackLink href={routes.history}>Workout history</BackLink>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight break-words lg:text-3xl">{state.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {when}
                {workout.planName ? ` · ${workout.planName}` : ""}
              </p>
            </div>
            <WorkoutActions sessionId={state.sessionId} name={state.name} />
          </div>
        </>
      )}

      <SummaryStats stats={summary.stats} />

      {summary.stats.setCount === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          No sets were completed in this workout, so there is no volume or progress to report.
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-6">
        <div className="grid gap-5 lg:gap-6">
          <PersonalRecords records={summary.records} celebrate={justFinished} />
          <ExerciseBreakdown exercises={summary.exercises} open={!justFinished} timeZone={user.timeZone} />
          <PreviousComparison comparison={summary.comparison} timeZone={user.timeZone} />
        </div>
        <div className="grid gap-5 lg:gap-6">
          <WorkoutHighlights highlights={summary.highlights} />
          <MuscleWork muscles={summary.muscles} />
          <SessionNotes key={state.notes} sessionId={state.sessionId} initial={state.notes} />
        </div>
      </div>

      <div className="grid gap-3 sm:flex sm:flex-wrap sm:justify-end">
        <Button asChild variant="outline" className={buttonClass}>
          <Link href={routes.dashboard}>
            <LayoutDashboard aria-hidden /> Back to Dashboard
          </Link>
        </Button>
        {justFinished ? (
          <Button asChild variant="outline" className={buttonClass}>
            <Link href={`${routes.workouts}/${state.sessionId}`}>
              <FileText aria-hidden /> View Workout Details
            </Link>
          </Button>
        ) : null}
        <RepeatWorkoutButton sessionId={state.sessionId} className={buttonClass} />
      </div>
    </div>
  );
}

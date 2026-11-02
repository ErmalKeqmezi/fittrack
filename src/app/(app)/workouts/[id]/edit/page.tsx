import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { routes } from "@/config/routes";
import { requireUser } from "@/features/auth/queries";
import { listExercises } from "@/features/exercises/queries";
import { TrackerLoader } from "@/features/workouts/components/tracker-loader";
import { getPreviousPerformance, getWorkout } from "@/features/workouts/queries";
import { isUuid } from "@/lib/uuid";

export const metadata: Metadata = { title: "Edit workout" };

export default async function EditWorkoutPage({ params }: PageProps<"/workouts/[id]/edit">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [user, workout, exercises] = await Promise.all([requireUser(), getWorkout(id), listExercises()]);
  if (!workout) notFound();
  // In-progress workouts are edited in the live tracker.
  if (workout.state.status !== "completed") redirect(`${routes.workouts}/${id}`);

  const previous = await getPreviousPerformance(
    workout.state.exercises.map((e) => e.exerciseId),
    workout.state.startedAt,
    workout.state.sessionId,
  );

  return (
    <TrackerLoader
      initial={workout.state}
      serverUpdatedAt={workout.updatedAt}
      previous={previous}
      library={exercises.filter((e) => !e.isArchived)}
      timeZone={user.timeZone}
      planName={workout.planName}
    />
  );
}

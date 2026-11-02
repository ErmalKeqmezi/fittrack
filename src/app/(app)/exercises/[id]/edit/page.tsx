import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/layout/back-link";
import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/panel";
import { routes } from "@/config/routes";
import { ExerciseForm } from "@/features/exercises/components/exercise-form";
import { getExercise, listMuscleGroups } from "@/features/exercises/queries";
import { isUuid } from "@/lib/uuid";

export const metadata: Metadata = { title: "Edit exercise" };

export default async function EditExercisePage({ params }: PageProps<"/exercises/[id]/edit">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [exercise, muscleGroups] = await Promise.all([getExercise(id), listMuscleGroups()]);
  // Built-in exercises are read-only.
  if (!exercise || !exercise.isCustom) notFound();

  const detailHref = `${routes.exercises}/${exercise.id}`;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5 lg:mx-0 lg:gap-6">
      <BackLink href={detailHref}>{exercise.name}</BackLink>
      <PageHeader
        title="Edit exercise"
        description="Changes apply everywhere. Past workouts keep the name they were logged with."
      />
      <Panel>
        <ExerciseForm exercise={exercise} muscleGroups={muscleGroups} cancelHref={detailHref} />
      </Panel>
    </div>
  );
}

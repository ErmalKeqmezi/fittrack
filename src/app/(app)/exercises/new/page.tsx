import type { Metadata } from "next";

import { BackLink } from "@/components/layout/back-link";
import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/panel";
import { routes } from "@/config/routes";
import { ExerciseForm } from "@/features/exercises/components/exercise-form";
import { listMuscleGroups } from "@/features/exercises/queries";

export const metadata: Metadata = { title: "New exercise" };

export default async function NewExercisePage() {
  const muscleGroups = await listMuscleGroups();

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5 lg:mx-0 lg:gap-6">
      <BackLink href={routes.exercises}>Exercise library</BackLink>
      <PageHeader title="New exercise" description="Add a movement that isn't in the built-in library." />
      <Panel>
        <ExerciseForm muscleGroups={muscleGroups} cancelHref={routes.exercises} />
      </Panel>
    </div>
  );
}

import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { ExerciseLibrary } from "@/features/exercises/components/exercise-library";
import { listExercises } from "@/features/exercises/queries";

export const metadata: Metadata = { title: "Exercises" };

export default async function ExercisesPage() {
  const exercises = await listExercises();
  const customCount = exercises.filter((e) => e.isCustom && !e.isArchived).length;

  return (
    <div className="grid gap-5 lg:gap-6">
      <PageHeader
        title="Exercise library"
        description={`${exercises.filter((e) => !e.isCustom).length} built-in · ${customCount} custom`}
        actions={
          <Button asChild className="h-11 rounded-xl px-4">
            <Link href={routes.newExercise}>
              <Plus aria-hidden /> New exercise
            </Link>
          </Button>
        }
      />
      <ExerciseLibrary exercises={exercises} />
    </div>
  );
}

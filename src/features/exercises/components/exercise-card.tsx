import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

import type { Exercise } from "../types";
import { ExerciseMeta, ExerciseStatusBadges } from "./exercise-badges";

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <Link
      href={`${routes.exercises}/${exercise.id}`}
      className={cn(
        "group flex min-h-[72px] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-colors",
        "hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.99]",
        exercise.isArchived && "opacity-60",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-medium">{exercise.name}</p>
          <ExerciseStatusBadges exercise={exercise} />
        </div>
        <p className="mt-0.5 truncate text-xs">
          <span className="text-brand-soft">{exercise.primaryMuscle.name}</span>
          <span className="text-muted-foreground"> · </span>
          <ExerciseMeta exercise={exercise} />
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

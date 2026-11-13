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
        // An index row, not a card: the library reads as a ruled list.
        "group flex min-h-16 items-center gap-3 border-b border-border py-3 transition-colors",
        "hover:bg-secondary/50 focus-visible:outline-2 focus-visible:outline-ring active:bg-secondary/70",
        exercise.isArchived && "opacity-60",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate font-display text-xl leading-tight font-semibold tracking-[0.015em]">{exercise.name}</p>
          <ExerciseStatusBadges exercise={exercise} />
        </div>
        <p className="mt-0.5 truncate text-xs">
          <span className="text-brand-soft">{exercise.primaryMuscle.name}</span>
          <span className="text-muted-foreground"> · </span>
          <ExerciseMeta exercise={exercise} />
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
    </Link>
  );
}

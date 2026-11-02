"use client";

import { ChevronRight, Dumbbell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { routes } from "@/config/routes";

import type { InProgressWorkout } from "../queries";
import { ElapsedTime } from "./elapsed-time";

/** Shown on every page except the tracker while a workout is in progress. */
export function WorkoutBanner({ workout }: { workout: InProgressWorkout }) {
  const href = `${routes.workouts}/${workout.id}`;
  if (usePathname() === href) return null;

  return (
    <Link
      href={href}
      className="mb-5 flex items-center gap-3 rounded-2xl border border-primary/40 bg-accent px-4 py-3 text-accent-foreground transition-colors hover:bg-accent/80 lg:mb-6"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Dumbbell className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{workout.name} in progress</span>
        <span className="block text-xs text-muted-foreground">
          <ElapsedTime since={workout.startedAt} className="tabular-nums" /> · tap to resume
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0" aria-hidden />
    </Link>
  );
}

"use client";

import { ArrowDown, ArrowUp, Gauge, ListX, MoreVertical, NotebookPen, Plus, Trash2 } from "lucide-react";
import { memo, useState, type Dispatch } from "react";

import { ConfirmAction } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateKey, toDateKey } from "@/lib/dates";
import { formatVolume } from "@/lib/format";
import { cn } from "@/lib/utils";

import { exerciseProgress, matchingPreviousSet, MAX_SETS_PER_EXERCISE, previousVolume, suggestionFor, type TrackerAction } from "../tracker-state";
import type { PreviousPerformance, TrackerExercise } from "../types";
import { SetRow } from "./set-row";

function newId() {
  return crypto.randomUUID();
}

/** Memoized: typing in one exercise doesn't re-render the others. */
export const ExerciseCard = memo(function ExerciseCard({
  exercise,
  index,
  count,
  previous,
  live,
  timeZone,
  dispatch,
}: {
  exercise: TrackerExercise;
  index: number;
  count: number;
  previous: PreviousPerformance | undefined;
  live: boolean;
  timeZone: string;
  dispatch: Dispatch<TrackerAction>;
}) {
  const [editingSets, setEditingSets] = useState(false);
  const progress = exerciseProgress(exercise);
  const lastVolume = previousVolume(previous);
  const hasLoggedSets = exercise.sets.some((s) => s.done);
  let workingIndex = 0;

  return (
    <section aria-labelledby={`ex-${exercise.id}`} className="rounded-2xl border border-border bg-card">
      <header className="flex items-start gap-2 p-4 pb-2">
        <div className="min-w-0 flex-1">
          <h3 id={`ex-${exercise.id}`} className="truncate text-base font-semibold">
            {exercise.name}
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            {exercise.targets
              ? `Target ${exercise.targets.sets} × ${exercise.targets.repsMin === exercise.targets.repsMax ? exercise.targets.repsMin : `${exercise.targets.repsMin}–${exercise.targets.repsMax}`} · `
              : ""}
            {live ? `${progress.doneSets}/${progress.totalSets} sets · ` : ""}
            <span className={cn(lastVolume !== null && progress.volumeKg > lastVolume && "text-brand-soft")}>
              {formatVolume(progress.volumeKg)}
            </span>
            {/* Last time's total as the target, rather than a mid-workout deficit. */}
            {lastVolume !== null ? ` of ${formatVolume(lastVolume)} last time` : ""}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="size-11 shrink-0 rounded-xl" aria-label={`Options for ${exercise.name}`}>
              <MoreVertical aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={() => dispatch({ type: "toggleExerciseNotes", exerciseId: exercise.id })}>
              <NotebookPen aria-hidden /> {exercise.showNotes ? "Hide note" : "Add note"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => dispatch({ type: "toggleRpe", exerciseId: exercise.id })}>
              <Gauge aria-hidden /> {exercise.showRpe ? "Hide RPE" : "Log RPE"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setEditingSets((v) => !v)}>
              <ListX aria-hidden /> {editingSets ? "Stop removing sets" : "Remove sets"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={index === 0} onSelect={() => dispatch({ type: "moveExercise", exerciseId: exercise.id, offset: -1 })}>
              <ArrowUp aria-hidden /> Move up
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={index === count - 1}
              onSelect={() => dispatch({ type: "moveExercise", exerciseId: exercise.id, offset: 1 })}
            >
              <ArrowDown aria-hidden /> Move down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {hasLoggedSets ? (
              <ConfirmAction
                title={`Remove ${exercise.name}?`}
                description="Its logged sets are removed from this workout."
                confirmLabel="Remove exercise"
                onConfirm={() => dispatch({ type: "removeExercise", exerciseId: exercise.id })}
                trigger={
                  <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                    <Trash2 aria-hidden /> Remove exercise
                  </DropdownMenuItem>
                }
              />
            ) : (
              <DropdownMenuItem variant="destructive" onSelect={() => dispatch({ type: "removeExercise", exerciseId: exercise.id })}>
                <Trash2 aria-hidden /> Remove exercise
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {previous ? (
        <p className="mx-4 mb-2 truncate rounded-lg bg-secondary/60 px-2.5 py-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">
            Last time · {formatDateKey(toDateKey(previous.startedAt, timeZone), { day: "numeric", month: "short" })}:
          </span>{" "}
          {previous.sets.map((s) => `${s.isWarmup ? "W " : ""}${s.weightKg}×${s.reps}`).join(", ")}
        </p>
      ) : (
        <p className="mx-4 mb-2 text-xs text-muted-foreground">First time logging this exercise.</p>
      )}

      {exercise.showNotes ? (
        <div className="mx-4 mb-2">
          <textarea
            aria-label={`Notes for ${exercise.name}`}
            value={exercise.notes}
            maxLength={1000}
            rows={2}
            placeholder="Grip, seat position, how it felt…"
            onChange={(e) => dispatch({ type: "setExerciseNotes", exerciseId: exercise.id, notes: e.target.value })}
            className="w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
          />
        </div>
      ) : null}

      <div role="table" aria-label={`${exercise.name} sets`} className="px-3 pb-2">
        <div
          role="row"
          className={cn(
            "grid gap-1.5 px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
            exercise.showRpe ? "grid-cols-[2.25rem_minmax(0,1fr)_4.25rem_3.5rem_3rem_2.75rem]" : "grid-cols-[2.25rem_minmax(0,1fr)_4.75rem_4rem_2.75rem]",
          )}
        >
          <span role="columnheader" className="text-center">Set</span>
          <span role="columnheader" className="text-center">Last</span>
          <span role="columnheader" className="text-center">kg</span>
          <span role="columnheader" className="text-center">Reps</span>
          {exercise.showRpe ? <span role="columnheader" className="text-center">RPE</span> : null}
          <span role="columnheader" className="sr-only">Done</span>
        </div>
        <div className="grid gap-1">
          {exercise.sets.map((set, i) => {
            const label = set.isWarmup ? "W" : String(++workingIndex);
            const suggestion = suggestionFor(exercise, i, previous);
            return (
              <SetRow
                key={set.id}
                exerciseId={exercise.id}
                set={set}
                label={label}
                previous={matchingPreviousSet(exercise.sets, i, previous)}
                suggestWeight={suggestion?.weight ?? null}
                suggestReps={suggestion?.reps ?? null}
                showRpe={exercise.showRpe}
                editingSets={editingSets}
                showDone={live}
                dispatch={dispatch}
              />
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 border-t border-border p-2">
        <Button
          variant="ghost"
          className="h-11 flex-1 rounded-xl text-primary hover:text-primary"
          disabled={exercise.sets.length >= MAX_SETS_PER_EXERCISE}
          onClick={() => dispatch({ type: "addSet", exerciseId: exercise.id, setId: newId() })}
        >
          <Plus aria-hidden /> Add set
        </Button>
        {editingSets ? (
          <Button variant="ghost" className="h-11 rounded-xl" onClick={() => setEditingSets(false)}>
            Done
          </Button>
        ) : null}
      </div>
    </section>
  );
});

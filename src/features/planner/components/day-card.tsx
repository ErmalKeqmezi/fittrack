import { BedDouble, ChevronRight, Plus, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Exercise } from "@/features/exercises/types";

import { AddPlanExercises } from "./add-plan-exercises";
import { cn } from "@/lib/utils";

import { formatRest, formatTargets, MAX_EXERCISES_PER_DAY, WEEKDAY_LABELS, type Weekday } from "../constants";
import type { PlanDay } from "../types";
import { DayDialog } from "./day-dialog";
import { SwapPlanExercise } from "./swap-plan-exercise";
import { TargetsDialog } from "./targets-dialog";

export function DayCard({
  day,
  index,
  isFirst,
  isLast,
  takenWeekdays,
  library,
}: {
  day: PlanDay;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  takenWeekdays: Map<number, string>;
  library: Exercise[];
}) {
  const totalSets = day.exercises.reduce((sum, e) => sum + e.targetSets, 0);
  // Weekdays held by the other days of the plan.
  const dayExerciseIds = day.exercises.map((e) => e.exercise.id);
  const otherWeekdays = new Map(takenWeekdays);
  if (day.weekday) otherWeekdays.delete(day.weekday);

  return (
    <section className={cn("rounded-2xl border bg-card", day.isRestDay ? "border-dashed border-border" : "border-border")}>
      <header className="flex items-center gap-3 p-4 sm:px-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-sm font-semibold tabular-nums text-muted-foreground">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">{day.name}</h3>
          <p className="truncate text-xs text-muted-foreground">
            {day.weekday ? WEEKDAY_LABELS[day.weekday as Weekday] : "Unscheduled"}
            {day.isRestDay
              ? " · Rest day"
              : ` · ${day.exercises.length} ${day.exercises.length === 1 ? "exercise" : "exercises"} · ${totalSets} sets`}
          </p>
        </div>
        <DayDialog
          mode="edit"
          day={day}
          isFirst={isFirst}
          isLast={isLast}
          takenWeekdays={otherWeekdays}
          trigger={
            <Button variant="ghost" className="h-10 shrink-0 rounded-xl px-3" aria-label={`Edit ${day.name}`}>
              <Settings2 aria-hidden /> <span className="hidden sm:inline">Edit day</span>
            </Button>
          }
        />
      </header>

      {day.isRestDay ? (
        <div className="flex items-center gap-2 border-t border-border px-4 py-4 text-sm text-muted-foreground sm:px-5">
          <BedDouble className="size-4" aria-hidden /> Recovery. No exercises planned.
        </div>
      ) : (
        <div className="border-t border-border">
          {day.exercises.length ? (
            <ol className="divide-y divide-border">
              {day.exercises.map((item, i) => (
                <li key={item.id} className="flex items-center">
                  <TargetsDialog
                    item={item}
                    isFirst={i === 0}
                    isLast={i === day.exercises.length - 1}
                    trigger={
                      <button
                        type="button"
                        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 pr-2 pl-4 text-left transition-colors hover:bg-secondary/50 focus-visible:bg-secondary/50 focus-visible:outline-none sm:px-5"
                      >
                        <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {item.exercise.name}
                            {item.exercise.isArchived ? <span className="ml-1.5 text-xs text-muted-foreground">(archived)</span> : null}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.exercise.primaryMuscle}
                            {item.restSeconds != null ? ` · rest ${formatRest(item.restSeconds)}` : ""}
                            {item.notes ? ` · ${item.notes}` : ""}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-lg bg-secondary px-2.5 py-1 text-sm font-semibold tabular-nums">
                          {formatTargets(item.targetSets, item.targetRepsMin, item.targetRepsMax)}
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      </button>
                    }
                  />
                  <SwapPlanExercise item={item} dayExerciseIds={dayExerciseIds} library={library} />
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">No exercises yet.</p>
          )}
          <div className="border-t border-border p-3 sm:px-5">
            <AddPlanExercises
              dayId={day.id}
              dayName={day.name}
              library={library}
              existingIds={day.exercises.map((e) => e.exercise.id)}
              trigger={
                <Button
                  variant="ghost"
                  className="h-11 w-full rounded-xl text-primary hover:text-primary"
                  disabled={day.exercises.length >= MAX_EXERCISES_PER_DAY}
                >
                  <Plus aria-hidden /> Add exercises
                </Button>
              }
            />
          </div>
        </div>
      )}
    </section>
  );
}

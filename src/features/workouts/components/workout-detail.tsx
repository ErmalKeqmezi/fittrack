import { ArrowDownRight, ArrowRight, ArrowUpRight, NotebookText } from "lucide-react";

import { Panel } from "@/components/panel";
import { estimateOneRepMax } from "@/features/analytics/calculations";
import { formatDateKey, toDateKey } from "@/lib/dates";
import { formatKg, formatSignedKg, formatVolume } from "@/lib/format";
import { cn } from "@/lib/utils";

import { parseReps, parseRpe, parseWeight } from "../set-values";
import { matchingPreviousSet } from "../tracker-state";
import type { PreviousPerformance, TrackerExercise } from "../types";

function workingSets(exercise: TrackerExercise) {
  return exercise.sets
    .map((s) => ({ ...s, w: parseWeight(s.weight) ?? 0, r: parseReps(s.reps) ?? 0, rpeValue: parseRpe(s.rpe) ?? null }))
    .filter((s) => s.done);
}

function Delta({ value, unit = "kg" }: { value: number; unit?: "kg" | "reps" }) {
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : ArrowRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 tabular-nums", value > 0 ? "text-brand-soft" : "text-muted-foreground")}>
      <Icon className="size-3.5" aria-hidden />
      {unit === "kg" ? formatSignedKg(value) : `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(value)}`}
    </span>
  );
}

/** One logged exercise with its sets and a comparison to the previous time it was trained. */
export function LoggedExercise({
  exercise,
  previous,
  timeZone,
}: {
  exercise: TrackerExercise;
  previous: PreviousPerformance | undefined;
  timeZone: string;
}) {
  const sets = workingSets(exercise);
  const working = sets.filter((s) => !s.isWarmup);
  const volume = Math.round(working.reduce((sum, s) => sum + s.w * s.r, 0) * 100) / 100;
  const top = working.reduce<(typeof working)[number] | null>((best, s) => (!best || s.w > best.w || (s.w === best.w && s.r > best.r) ? s : best), null);
  const bestE1rm = working.reduce<number | null>((best, s) => {
    const e = estimateOneRepMax(s.w, s.r);
    return e !== null && (best === null || e > best) ? e : best;
  }, null);

  const prevWorking = previous?.sets.filter((s) => !s.isWarmup) ?? [];
  const prevVolume = Math.round(prevWorking.reduce((sum, s) => sum + s.weightKg * s.reps, 0) * 100) / 100;
  const prevTop = prevWorking.reduce<(typeof prevWorking)[number] | null>(
    (best, s) => (!best || s.weightKg > best.weightKg || (s.weightKg === best.weightKg && s.reps > best.reps) ? s : best),
    null,
  );
  let workingIndex = 0;

  return (
    <Panel className="p-0 sm:p-0">
      <div className="p-4 pb-3 sm:px-5">
        <h3 className="text-base font-semibold">{exercise.name}</h3>
        <p className="text-xs text-muted-foreground tabular-nums">
          {working.length} working {working.length === 1 ? "set" : "sets"} · {formatVolume(volume)}
          {top ? ` · top set ${formatKg(top.w)} × ${top.r}` : ""}
          {bestE1rm !== null ? ` · est. 1RM ${formatKg(bestE1rm)}` : ""}
        </p>
      </div>

      <table className="w-full text-sm">
        <thead className="border-y border-border text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="w-14 py-2 pl-4 text-left font-medium sm:pl-5">Set</th>
            <th scope="col" className="py-2 text-left font-medium">Weight × reps</th>
            <th scope="col" className="py-2 text-right font-medium">RPE</th>
            <th scope="col" className="py-2 pr-4 text-right font-medium sm:pr-5">Last time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sets.map((s, i) => {
            const prev = matchingPreviousSet(sets, i, previous);
            return (
              <tr key={s.id}>
                <td className="py-2.5 pl-4 tabular-nums sm:pl-5">
                  {s.isWarmup ? <span className="text-amber-300">W</span> : ++workingIndex}
                </td>
                <td className="py-2.5 font-medium tabular-nums">
                  {formatKg(s.w)} × {s.r}
                </td>
                <td className="py-2.5 text-right text-muted-foreground tabular-nums">{s.rpeValue ?? "—"}</td>
                <td className="py-2.5 pr-4 text-right text-xs text-muted-foreground tabular-nums sm:pr-5">
                  {prev ? `${prev.weightKg} × ${prev.reps}` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-xs sm:px-5">
        {previous ? (
          <>
            <span className="text-muted-foreground">
              vs {formatDateKey(toDateKey(previous.startedAt, timeZone), { day: "numeric", month: "short" })}:
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              Volume <Delta value={Math.round((volume - prevVolume) * 100) / 100} />
            </span>
            {top && prevTop ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                Top weight <Delta value={Math.round((top.w - prevTop.weightKg) * 100) / 100} />
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-muted-foreground">First time this exercise was logged.</span>
        )}
      </div>

      {exercise.notes ? (
        <p className="flex gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:px-5">
          <NotebookText className="mt-0.5 size-4 shrink-0" aria-hidden /> {exercise.notes}
        </p>
      ) : null}
    </Panel>
  );
}

"use client";

import { Check, Trash2 } from "lucide-react";
import { memo } from "react";

import { formatWeightInput, validateSet } from "../set-values";
import type { PreviousSet, TrackerSet } from "../types";
import { cn } from "@/lib/utils";

type Props = {
  set: TrackerSet;
  label: string;
  previous: PreviousSet | undefined;
  suggestion: { weight: number; reps: number } | null;
  showRpe: boolean;
  editingSets: boolean;
  showDone: boolean;
  onChange: (field: "weight" | "reps" | "rpe", value: string) => void;
  onToggleWarmup: () => void;
  onToggleDone: () => void;
  onRemove: () => void;
};

const inputClass =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-input/30 px-1 text-center text-base font-semibold tabular-nums outline-none transition-colors placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

function selectAll(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.select();
}

export const SetRow = memo(function SetRow({
  set,
  label,
  previous,
  suggestion,
  showRpe,
  editingSets,
  showDone,
  onChange,
  onToggleWarmup,
  onToggleDone,
  onRemove,
}: Props) {
  const validity = validateSet(set);
  const canComplete = validity.complete || Boolean(suggestion && (set.weight === "" || validity.weight) && (set.reps === "" || validity.reps) && validity.rpe);

  return (
    <div
      role="row"
      className={cn(
        "grid items-center gap-1.5 rounded-xl px-1 py-1 transition-colors",
        showRpe ? "grid-cols-[2.25rem_minmax(0,1fr)_4.25rem_3.5rem_3rem_2.75rem]" : "grid-cols-[2.25rem_minmax(0,1fr)_4.75rem_4rem_2.75rem]",
        set.done && "bg-primary/10",
      )}
    >
      <button
        type="button"
        onClick={onToggleWarmup}
        aria-label={set.isWarmup ? `Warm-up set, tap to make it a working set` : `Set ${label}, tap to mark as warm-up`}
        className={cn(
          "grid h-9 place-items-center rounded-lg text-sm font-semibold tabular-nums",
          set.isWarmup ? "bg-amber-400/15 text-amber-300" : "bg-secondary text-muted-foreground",
        )}
      >
        {set.isWarmup ? "W" : label}
      </button>
      <span className="truncate text-center text-xs text-muted-foreground tabular-nums" title="Last time">
        {previous ? `${formatWeightInput(previous.weightKg)} × ${previous.reps}` : "—"}
      </span>
      <input
        aria-label="Weight in kg"
        inputMode="decimal"
        enterKeyHint="next"
        autoComplete="off"
        value={set.weight}
        placeholder={suggestion ? formatWeightInput(suggestion.weight) : "kg"}
        aria-invalid={set.weight !== "" && !validity.weight ? true : undefined}
        onFocus={selectAll}
        onChange={(e) => onChange("weight", e.target.value)}
        className={inputClass}
      />
      <input
        aria-label="Repetitions"
        inputMode="numeric"
        enterKeyHint="done"
        autoComplete="off"
        value={set.reps}
        placeholder={suggestion ? String(suggestion.reps) : "reps"}
        aria-invalid={set.reps !== "" && !validity.reps ? true : undefined}
        onFocus={selectAll}
        onChange={(e) => onChange("reps", e.target.value)}
        className={inputClass}
      />
      {showRpe ? (
        <input
          aria-label="RPE (optional)"
          inputMode="decimal"
          autoComplete="off"
          value={set.rpe}
          placeholder="RPE"
          aria-invalid={!validity.rpe ? true : undefined}
          onFocus={selectAll}
          onChange={(e) => onChange("rpe", e.target.value)}
          className={cn(inputClass, "text-sm")}
        />
      ) : null}
      {editingSets ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove set"
          className="grid size-11 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-4" />
        </button>
      ) : showDone ? (
        <button
          type="button"
          onClick={onToggleDone}
          disabled={!set.done && !canComplete}
          aria-pressed={set.done}
          aria-label={set.done ? "Completed, tap to undo" : "Mark set as completed"}
          className={cn(
            "grid size-11 place-items-center rounded-lg border transition-colors disabled:opacity-40",
            set.done ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50",
          )}
        >
          <Check className="size-5" strokeWidth={3} />
        </button>
      ) : (
        <span aria-hidden />
      )}
    </div>
  );
});

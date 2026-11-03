"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, Search, X } from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState, useTransition, type ReactNode } from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

import { BODY_REGION_LABELS, BODY_REGIONS, EQUIPMENT_LABELS, type BodyRegion } from "../constants";
import { defaultFilters, filterExercises } from "../filters";
import type { Exercise } from "../types";

const ROW_HEIGHT = 60;
const SEARCH_DEBOUNCE_MS = 150;

/**
 * Searchable multi-select of exercises. `onConfirm` receives the ids in pick
 * order and returns true when the dialog should close.
 *
 * Layout: header, search and muscle chips stay pinned; only the (virtualized)
 * list scrolls; the footer stays pinned with the selection count and action.
 */
export function ExercisePickerDialog({
  title,
  exercises,
  existingIds,
  maxSelectable,
  existingLabel = "Added",
  onConfirm,
  trigger,
}: {
  title: string;
  exercises: Exercise[];
  existingIds: Set<string>;
  maxSelectable: number;
  existingLabel?: string;
  onConfirm: (exerciseIds: string[]) => Promise<boolean>;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex h-[min(88dvh,44rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        {/* Mounted only while open, so state resets each time. */}
        {open ? (
          <PickerBody
            title={title}
            exercises={exercises}
            existingIds={existingIds}
            maxSelectable={maxSelectable}
            existingLabel={existingLabel}
            onConfirm={onConfirm}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PickerBody({
  title,
  exercises,
  existingIds,
  maxSelectable,
  existingLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  exercises: Exercise[];
  existingIds: Set<string>;
  maxSelectable: number;
  existingLabel: string;
  onConfirm: (exerciseIds: string[]) => Promise<boolean>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<BodyRegion | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const scrollRef = useRef<HTMLDivElement>(null);

  const results = useMemo(
    () => filterExercises(exercises, { ...defaultFilters, query: debouncedQuery, region }),
    [exercises, debouncedQuery, region],
  );

  // Not using the React Compiler, so its "cannot be memoized" notice does not apply.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
  });

  const remaining = maxSelectable - selected.length;

  const toggle = useCallback(
    (id: string) => {
      setSelected((current) =>
        current.includes(id) ? current.filter((x) => x !== id) : current.length < maxSelectable ? [...current, id] : current,
      );
    },
    [maxSelectable],
  );

  function chooseRegion(next: BodyRegion | null) {
    setRegion(next);
    scrollRef.current?.scrollTo({ top: 0 });
  }

  function add() {
    startTransition(async () => {
      if (await onConfirm(selected)) onClose();
    });
  }

  return (
    <>
      <div className="shrink-0 px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
        <DialogHeader className="pr-10 text-left">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription>Select one or more. They are added in the order you pick them.</DialogDescription>
        </DialogHeader>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises"
            aria-label="Search exercises"
            autoComplete="off"
            enterKeyHint="search"
            className="h-12 w-full rounded-xl border border-input bg-input/30 pr-11 pl-10 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-0.5 grid size-11 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground active:bg-secondary"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Muscle chips: natural height, horizontal scroll, room for the focus ring. */}
      <div
        role="radiogroup"
        aria-label="Muscle group"
        className="flex shrink-0 snap-x scroll-px-5 gap-2 overflow-x-auto overscroll-x-contain px-5 py-1.5 sm:scroll-px-6 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {[null, ...BODY_REGIONS].map((r) => (
          <button
            key={r ?? "all"}
            type="button"
            role="radio"
            aria-checked={region === r}
            onClick={() => chooseRegion(r)}
            className={cn(
              "inline-flex h-11 shrink-0 snap-start items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              region === r
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground active:bg-secondary",
            )}
          >
            {r ? BODY_REGION_LABELS[r] : "All"}
          </button>
        ))}
      </div>

      <div className="relative mt-2 min-h-0 flex-1 border-t border-border">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto overscroll-contain px-3 pb-6 [-webkit-overflow-scrolling:touch] sm:px-4"
          aria-label="Exercises"
          role="group"
        >
          {results.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No exercises match.</p>
          ) : (
            <ul className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map((item) => {
                const exercise = results[item.index];
                const order = selected.indexOf(exercise.id);
                return (
                  <PickerRow
                    key={exercise.id}
                    exercise={exercise}
                    top={item.start}
                    order={order}
                    added={existingIds.has(exercise.id)}
                    addedLabel={existingLabel}
                    full={order === -1 && remaining <= 0}
                    onToggle={toggle}
                  />
                );
              })}
            </ul>
          )}
        </div>
        {/* Fade so the last visible row doesn't end abruptly above the footer. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-popover to-transparent" />
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {maxSelectable <= 0
            ? "No room for more exercises."
            : selected.length
              ? `${selected.length} selected`
              : "Nothing selected"}
        </p>
        <button
          type="button"
          onClick={add}
          disabled={!selected.length || pending}
          className={cn(
            "inline-flex h-12 min-w-36 items-center justify-center rounded-xl px-5 text-sm font-semibold transition-colors",
            selected.length && !pending
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 active:bg-primary/85"
              : "cursor-not-allowed border border-border bg-secondary text-muted-foreground",
          )}
        >
          {pending ? "Adding…" : selected.length ? `Add ${selected.length} ${selected.length === 1 ? "exercise" : "exercises"}` : "Add exercises"}
        </button>
      </div>
    </>
  );
}

const PickerRow = memo(function PickerRow({
  exercise,
  top,
  order,
  added,
  addedLabel,
  full,
  onToggle,
}: {
  exercise: Exercise;
  top: number;
  order: number;
  added: boolean;
  addedLabel: string;
  full: boolean;
  onToggle: (id: string) => void;
}) {
  const selected = order !== -1;
  const disabled = added || full;

  return (
    <li className="absolute inset-x-0" style={{ height: ROW_HEIGHT, transform: `translateY(${top}px)` }}>
      <button
        type="button"
        onClick={() => onToggle(exercise.id)}
        disabled={disabled}
        aria-pressed={added ? undefined : selected}
        aria-label={added ? `${exercise.name}, ${addedLabel.toLowerCase()}` : undefined}
        className={cn(
          "flex h-full w-full items-center gap-3 rounded-xl px-3 text-left transition-colors",
          selected ? "bg-accent" : "hover:bg-secondary/70 active:bg-secondary",
          disabled && "cursor-not-allowed opacity-50 hover:bg-transparent active:bg-transparent",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold tabular-nums",
            selected && "border-primary bg-primary text-primary-foreground",
            added && "border-transparent bg-secondary text-muted-foreground",
            !selected && !added && "border-border",
          )}
        >
          {added ? <Check className="size-3.5" /> : selected ? order + 1 : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{exercise.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {exercise.primaryMuscle.name} · {EQUIPMENT_LABELS[exercise.equipment]}
          </span>
        </span>
        {added ? (
          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{addedLabel}</span>
        ) : null}
      </button>
    </li>
  );
});

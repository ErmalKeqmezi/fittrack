"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowLeft, ArrowLeftRight, Search, X } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";

import { NativeSelect } from "@/components/forms/native-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

import { suggestAlternatives } from "../alternatives";
import { BODY_REGION_LABELS, BODY_REGIONS, EQUIPMENT, EQUIPMENT_LABELS, type BodyRegion, type Equipment } from "../constants";
import { defaultFilters, filterExercises } from "../filters";
import type { Exercise } from "../types";

export type SwapRequest = {
  /** The exercise being replaced. */
  original: { exerciseId: string; name: string };
  /** Exercises that can't be chosen, with the reason shown on their row. */
  unavailableIds: ReadonlySet<string>;
  unavailableLabel: string;
  /** Sets already completed on the original in this workout. */
  completedSets?: number;
  /** Sets the replacement starts with. */
  remainingSets?: number;
  /** Set when the saved plan can be updated too. */
  planName?: string | null;
  /** Where the swap applies when the plan isn't updated. */
  scope: "workout" | "plan";
};

type Row = { kind: "header"; label: string } | { kind: "exercise"; exercise: Exercise; suggested: boolean };

const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 64;

/**
 * Chooses a replacement for an exercise: suggestions first, the whole library
 * searchable below, then a confirmation step that says exactly what changes.
 */
export function SwapExerciseDialog({
  request,
  library,
  onConfirm,
  onClose,
}: {
  request: SwapRequest | null;
  library: Exercise[];
  onConfirm: (replacement: Exercise, options: { updatePlan: boolean }) => Promise<boolean>;
  onClose: () => void;
}) {
  return (
    <Dialog open={request !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="flex h-[min(88dvh,44rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        {request ? <SwapBody key={request.original.exerciseId} request={request} library={library} onConfirm={onConfirm} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function SwapBody({
  request,
  library,
  onConfirm,
  onClose,
}: {
  request: SwapRequest;
  library: Exercise[];
  onConfirm: (replacement: Exercise, options: { updatePlan: boolean }) => Promise<boolean>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<BodyRegion | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [chosen, setChosen] = useState<Exercise | null>(null);
  const [updatePlan, setUpdatePlan] = useState(false);
  const [pending, startTransition] = useTransition();
  const debouncedQuery = useDebouncedValue(query, 150);
  const scrollRef = useRef<HTMLDivElement>(null);

  const original = useMemo(() => library.find((e) => e.id === request.original.exerciseId) ?? null, [library, request.original.exerciseId]);
  const filtering = Boolean(debouncedQuery.trim() || region || equipment);

  const rows = useMemo<Row[]>(() => {
    const all = filterExercises(library, { ...defaultFilters, query: debouncedQuery, region, equipment }).filter(
      (e) => e.id !== request.original.exerciseId,
    );
    if (filtering) return all.map((exercise) => ({ kind: "exercise", exercise, suggested: false }));

    const suggested = original ? suggestAlternatives(original, library, request.unavailableIds) : [];
    const suggestedIds = new Set(suggested.map((e) => e.id));
    return [
      ...(suggested.length
        ? [
            { kind: "header", label: `Suggested for ${original!.primaryMuscle.name}` } as Row,
            ...suggested.map((exercise) => ({ kind: "exercise", exercise, suggested: true }) as Row),
            { kind: "header", label: "All exercises" } as Row,
          ]
        : []),
      ...all.filter((e) => !suggestedIds.has(e.id)).map((exercise) => ({ kind: "exercise", exercise, suggested: false }) as Row),
    ];
  }, [library, debouncedQuery, region, equipment, filtering, original, request.original.exerciseId, request.unavailableIds]);

  // Not using the React Compiler, so its "cannot be memoized" notice does not apply.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => (rows[index].kind === "header" ? HEADER_HEIGHT : ROW_HEIGHT),
    overscan: 6,
  });

  function confirm() {
    if (!chosen) return;
    startTransition(async () => {
      if (await onConfirm(chosen, { updatePlan })) onClose();
    });
  }

  if (chosen) {
    const partly = (request.completedSets ?? 0) > 0;
    const sets = (n: number) => `${n} ${n === 1 ? "set" : "sets"}`;
    return (
      <>
        <div className="shrink-0 px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
          <DialogHeader className="pr-10 text-left">
            <DialogTitle className="text-base">Swap to {chosen.name}?</DialogTitle>
            <DialogDescription>Replaces {request.original.name}. Check what changes before confirming.</DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-border px-5 py-4 sm:px-6">
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Main muscle</dt>
              <dd className="font-medium">{chosen.primaryMuscle.name}</dd>
            </div>
            {chosen.secondaryMuscles.length ? (
              <div>
                <dt className="text-xs text-muted-foreground">Also works</dt>
                <dd>{chosen.secondaryMuscles.map((m) => m.name).join(", ")}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs text-muted-foreground">Equipment</dt>
              <dd>{EQUIPMENT_LABELS[chosen.equipment]}</dd>
            </div>
            {chosen.description ? (
              <div>
                <dt className="text-xs text-muted-foreground">How</dt>
                <dd className="text-muted-foreground">{chosen.description}</dd>
              </div>
            ) : null}
          </dl>

          <ul className="mt-4 grid gap-2 text-sm">
            {partly ? (
              <li className="rounded-xl border border-primary/40 bg-accent/40 px-3 py-2.5">
                <p className="font-medium">
                  {request.original.name} is already partly done
                </p>
                <p className="text-muted-foreground">
                  Your {sets(request.completedSets!)} stay logged under {request.original.name}. {chosen.name} is added after it
                  {request.remainingSets ? ` for the remaining ${sets(request.remainingSets)}` : ""}.
                </p>
              </li>
            ) : (
              <li className="rounded-xl bg-secondary/60 px-3 py-2.5 text-muted-foreground">
                {chosen.name} takes its place, with the same order, set and rep targets, rest time and note.
              </li>
            )}
            <li className="rounded-xl bg-secondary/60 px-3 py-2.5 text-muted-foreground">
              Weights aren&apos;t copied across. You&apos;ll see your own last numbers for {chosen.name}, if you&apos;ve logged it before.
            </li>
          </ul>

          {request.scope === "workout" && request.planName ? (
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border px-3 py-3">
              <input type="checkbox" checked={updatePlan} onChange={(e) => setUpdatePlan(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-primary" />
              <span className="text-sm">
                <span className="font-medium">Also update my {request.planName} plan</span>
                <span className="block text-muted-foreground">
                  Future workouts will use {chosen.name}. Workouts you&apos;ve already finished keep {request.original.name}.
                </span>
              </span>
            </label>
          ) : null}
          {request.scope === "plan" ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Your next workout from this plan uses {chosen.name}. Workouts you&apos;ve already finished keep {request.original.name}.
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
          <Button variant="ghost" className="h-12 rounded-xl px-3" onClick={() => setChosen(null)} disabled={pending}>
            <ArrowLeft aria-hidden /> Back
          </Button>
          <Button className="h-12 rounded-xl px-5 font-semibold" onClick={confirm} disabled={pending}>
            <ArrowLeftRight aria-hidden />
            {pending ? "Swapping…" : request.scope === "plan" ? "Swap in plan" : updatePlan ? "Swap and update plan" : "Swap for this workout"}
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="shrink-0 px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
        <DialogHeader className="pr-10 text-left">
          <DialogTitle className="text-base">Swap {request.original.name}</DialogTitle>
          <DialogDescription>Pick a replacement. Nothing changes until you confirm.</DialogDescription>
        </DialogHeader>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all exercises"
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

        <div className="mt-2 grid grid-cols-2 gap-2">
          <NativeSelect aria-label="Muscle group" value={region ?? ""} onChange={(e) => setRegion((e.target.value || null) as BodyRegion | null)}>
            <option value="">All muscles</option>
            {BODY_REGIONS.map((r) => (
              <option key={r} value={r}>
                {BODY_REGION_LABELS[r]}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Equipment" value={equipment ?? ""} onChange={(e) => setEquipment((e.target.value || null) as Equipment | null)}>
            <option value="">All equipment</option>
            {EQUIPMENT.map((item) => (
              <option key={item} value={item}>
                {EQUIPMENT_LABELS[item]}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 border-t border-border">
        <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain px-3 pb-6 [-webkit-overflow-scrolling:touch] sm:px-4" role="group" aria-label="Replacement exercises">
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No exercises match.</p>
          ) : (
            <ul className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map((item) => {
                const row = rows[item.index];
                const style = { height: item.size, transform: `translateY(${item.start}px)` };
                if (row.kind === "header") {
                  return (
                    <li key={`h-${row.label}`} className="absolute inset-x-0 flex items-end px-3 pb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase" style={style}>
                      {row.label}
                    </li>
                  );
                }
                const { exercise } = row;
                const unavailable = request.unavailableIds.has(exercise.id);
                return (
                  <li key={`${row.suggested ? "s" : "a"}-${exercise.id}`} className="absolute inset-x-0" style={style}>
                    <button
                      type="button"
                      disabled={unavailable}
                      onClick={() => setChosen(exercise)}
                      className={cn(
                        "flex h-full w-full items-center gap-3 rounded-xl px-3 text-left transition-colors hover:bg-secondary/70 active:bg-secondary",
                        unavailable && "cursor-not-allowed opacity-50 hover:bg-transparent active:bg-transparent",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{exercise.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {exercise.primaryMuscle.name} · {EQUIPMENT_LABELS[exercise.equipment]}
                          {exercise.secondaryMuscles.length ? ` · also ${exercise.secondaryMuscles.map((m) => m.name).join(", ")}` : ""}
                        </span>
                      </span>
                      {unavailable ? (
                        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{request.unavailableLabel}</span>
                      ) : exercise.isCustom ? (
                        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Custom</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

"use client";

import { Search, SearchX, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { NativeSelect } from "@/components/forms/native-select";
import { EmptyState } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  BODY_REGION_LABELS,
  BODY_REGIONS,
  CATEGORIES,
  CATEGORY_LABELS,
  EQUIPMENT,
  EQUIPMENT_LABELS,
  SOURCE_LABELS,
  SOURCES,
  type BodyRegion,
} from "../constants";
import { defaultFilters, filterExercises, filtersToParams, hasActiveFilters, parseFilters, type ExerciseFilters } from "../filters";
import type { Exercise } from "../types";
import { ExerciseCard } from "./exercise-card";

/**
 * Instant client-side search over the whole library (it is small), with the
 * filter state mirrored into the URL so it survives reloads and back/forward.
 */
export function ExerciseLibrary({ exercises }: { exercises: Exercise[] }) {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ExerciseFilters>(() => parseFilters(new URLSearchParams(searchParams)));
  const results = useMemo(() => filterExercises(exercises, filters), [exercises, filters]);
  const hasArchived = exercises.some((e) => e.isArchived);
  const chipsRef = useRef<HTMLDivElement>(null);

  // On phones the chip row scrolls; bring a region selected via the URL into view.
  useEffect(() => {
    chipsRef.current
      ?.querySelector('[aria-checked="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, []);

  function update(patch: Partial<ExerciseFilters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    const query = filtersToParams(next).toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }

  const regionCounts = useMemo(() => {
    const visible = filterExercises(exercises, { ...filters, region: null });
    const counts = new Map<BodyRegion, number>();
    for (const e of visible) counts.set(e.primaryMuscle.bodyRegion, (counts.get(e.primaryMuscle.bodyRegion) ?? 0) + 1);
    return counts;
  }, [exercises, filters]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder="Search by name, muscle or equipment"
            aria-label="Search exercises"
            enterKeyHint="search"
            autoComplete="off"
            className="h-12 w-full rounded-xl border border-input bg-input/30 pr-11 pl-10 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.query ? (
            <button
              type="button"
              onClick={() => update({ query: "" })}
              aria-label="Clear search"
              className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-[1.35fr_1fr_1fr] gap-2 lg:contents">
          <NativeSelect
            aria-label="Equipment"
            value={filters.equipment ?? ""}
            onChange={(e) => update({ equipment: (e.target.value || null) as ExerciseFilters["equipment"] })}
            className="lg:w-40"
          >
            <option value="">Equipment</option>
            {EQUIPMENT.map((eq) => (
              <option key={eq} value={eq}>
                {EQUIPMENT_LABELS[eq]}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Category"
            value={filters.category ?? ""}
            onChange={(e) => update({ category: (e.target.value || null) as ExerciseFilters["category"] })}
            className="lg:w-36"
          >
            <option value="">Type</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Source"
            value={filters.source}
            onChange={(e) => update({ source: e.target.value as ExerciseFilters["source"] })}
            className="lg:w-40"
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div
        ref={chipsRef}
        role="radiogroup"
        aria-label="Muscle group"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
      >
        <RegionChip active={!filters.region} onClick={() => update({ region: null })}>
          All
        </RegionChip>
        {BODY_REGIONS.map((region) => (
          <RegionChip
            key={region}
            active={filters.region === region}
            onClick={() => update({ region: filters.region === region ? null : region })}
          >
            {BODY_REGION_LABELS[region]}
            <span className="text-[11px] opacity-60 tabular-nums">{regionCounts.get(region) ?? 0}</span>
          </RegionChip>
        ))}
      </div>

      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {results.length} {results.length === 1 ? "exercise" : "exercises"}
        </p>
        <div className="flex items-center gap-1">
          {hasArchived ? (
            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={filters.showArchived}
                onChange={(e) => update({ showArchived: e.target.checked })}
                className="size-4 accent-primary"
              />
              Show archived
            </label>
          ) : null}
          {hasActiveFilters(filters) ? (
            <Button variant="ghost" size="sm" className="h-9 rounded-lg" onClick={() => update(defaultFilters)}>
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      {results.length ? (
        <ul className="grid border-t border-border md:grid-cols-2 md:gap-x-10 xl:grid-cols-3">
          {results.map((exercise) => (
            <li key={exercise.id}>
              <ExerciseCard exercise={exercise} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={SearchX} title="No exercises match">
          Try another search or clear the filters. You can also create a custom exercise.
        </EmptyState>
      )}
    </div>
  );
}

function RegionChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/skeleton";

/**
 * The tracker renders on the client only: it restores on-device drafts from
 * localStorage synchronously on first render, which the server cannot see.
 */
export const TrackerLoader = dynamic(() => import("./workout-tracker").then((m) => m.WorkoutTracker), {
  ssr: false,
  loading: () => (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading workout">
      <Skeleton className="h-16 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  ),
});

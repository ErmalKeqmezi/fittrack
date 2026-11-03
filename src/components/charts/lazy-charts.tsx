"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/skeleton";

/**
 * Recharts is the largest client dependency (~105 KB gzipped). Loading the
 * charts on demand keeps it out of the initial JavaScript of every page;
 * the skeletons reserve the same space so nothing shifts when they appear.
 */
export const LazyPeriodBarChart = dynamic(() => import("./period-bar-chart").then((m) => m.PeriodBarChart), {
  ssr: false,
  loading: () => (
    <div aria-busy="true" aria-label="Loading chart">
      <Skeleton className="mb-3 h-10 w-44 rounded-xl" />
      <Skeleton className="h-44 rounded-xl sm:h-56" />
    </div>
  ),
});

export const LazyProgressLineChart = dynamic(() => import("./progress-line-chart").then((m) => m.ProgressLineChart), {
  ssr: false,
  loading: () => (
    <div aria-busy="true" aria-label="Loading chart">
      <Skeleton className="h-56 rounded-xl sm:h-72" />
    </div>
  ),
});

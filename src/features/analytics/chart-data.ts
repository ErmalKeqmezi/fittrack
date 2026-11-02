import { addDays, formatDateKey } from "@/lib/dates";

import type { PeriodBar } from "@/components/charts/period-bar-chart";

import type { MonthBucket, WeekBucket } from "./calculations";

const short = (key: string) => formatDateKey(key, { day: "numeric", month: "short" });

export function weeklyBars(buckets: WeekBucket[]): PeriodBar[] {
  return buckets.map((b, i) => ({
    key: b.weekStart,
    label: short(b.weekStart),
    rangeLabel: `${short(b.weekStart)} – ${short(addDays(b.weekStart, 6))}`,
    workouts: b.workouts,
    volumeKg: b.volumeKg,
    current: i === buckets.length - 1,
  }));
}

export function monthlyBars(buckets: MonthBucket[]): PeriodBar[] {
  return buckets.map((b, i) => ({
    key: b.monthStart,
    label: formatDateKey(b.monthStart, { month: "short" }),
    rangeLabel: formatDateKey(b.monthStart, { month: "long", year: "numeric" }),
    workouts: b.workouts,
    volumeKg: b.volumeKg,
    current: i === buckets.length - 1,
  }));
}

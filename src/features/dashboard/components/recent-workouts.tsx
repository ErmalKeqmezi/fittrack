import { History } from "lucide-react";

import { EmptyState, Panel, PanelHeader } from "@/components/panel";
import { toDateKey, formatDateKey } from "@/lib/dates";
import { formatDuration, formatInteger, formatVolume } from "@/lib/format";

import type { DashboardData } from "../queries";

export function RecentWorkouts({ workouts, timeZone }: { workouts: DashboardData["recentWorkouts"]; timeZone: string }) {
  const dateOf = (iso: string) => formatDateKey(toDateKey(iso, timeZone), { weekday: "short", day: "numeric", month: "short" });

  return (
    <Panel>
      <PanelHeader title="Recent workouts" description="Your latest completed sessions" icon={History} />
      {workouts.length === 0 ? (
        <EmptyState icon={History} title="No workouts yet">
          Completed sessions show up here with their duration, sets and volume.
        </EmptyState>
      ) : (
        <>
          {/* Phones: stacked rows */}
          <ul className="divide-y divide-border md:hidden">
            {workouts.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{w.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {dateOf(w.startedAt)} · {formatDuration(w.durationMinutes)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">{formatVolume(w.volumeKg)}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{w.workingSetCount} sets</p>
                </div>
              </li>
            ))}
          </ul>

          {/* Tablet and desktop: table */}
          <div className="-mx-1 hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th scope="col" className="px-1 pb-2.5 font-medium">Date</th>
                  <th scope="col" className="px-1 pb-2.5 font-medium">Workout</th>
                  <th scope="col" className="px-1 pb-2.5 text-right font-medium">Duration</th>
                  <th scope="col" className="px-1 pb-2.5 text-right font-medium">Exercises</th>
                  <th scope="col" className="px-1 pb-2.5 text-right font-medium">Sets</th>
                  <th scope="col" className="px-1 pb-2.5 text-right font-medium">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {workouts.map((w) => (
                  <tr key={w.id} className="transition-colors hover:bg-secondary/50">
                    <td className="whitespace-nowrap px-1 py-3 text-muted-foreground">{dateOf(w.startedAt)}</td>
                    <td className="max-w-48 truncate px-1 py-3 font-medium">{w.name}</td>
                    <td className="whitespace-nowrap px-1 py-3 text-right tabular-nums">{formatDuration(w.durationMinutes)}</td>
                    <td className="px-1 py-3 text-right tabular-nums">{formatInteger(w.exerciseCount)}</td>
                    <td className="px-1 py-3 text-right tabular-nums">{formatInteger(w.workingSetCount)}</td>
                    <td className="whitespace-nowrap px-1 py-3 text-right font-medium tabular-nums">{formatVolume(w.volumeKg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  );
}

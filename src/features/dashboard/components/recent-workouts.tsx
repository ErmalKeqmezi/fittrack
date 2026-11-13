import { History } from "lucide-react";

import Link from "next/link";

import { EmptyState, Panel, PanelHeader } from "@/components/panel";
import { routes } from "@/config/routes";
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
              <li key={w.id}>
                <Link href={`${routes.workouts}/${w.id}`} className="flex items-center justify-between gap-3 py-3 active:bg-secondary/60">
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
                </Link>
              </li>
            ))}
          </ul>

          {/* Tablet and desktop: table */}
          <div className="-mx-1 hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="eyebrow">
                <tr className="border-b border-border">
                  <th scope="col" className="px-1 pb-3 font-semibold">Date</th>
                  <th scope="col" className="px-1 pb-3 font-semibold">Workout</th>
                  <th scope="col" className="px-1 pb-3 text-right font-semibold">Duration</th>
                  <th scope="col" className="px-1 pb-3 text-right font-semibold">Exercises</th>
                  <th scope="col" className="px-1 pb-3 text-right font-semibold">Sets</th>
                  <th scope="col" className="px-1 pb-3 text-right font-semibold">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {workouts.map((w) => (
                  <tr key={w.id} className="transition-colors hover:bg-secondary/50">
                    <td className="whitespace-nowrap px-1 py-3 text-muted-foreground">{dateOf(w.startedAt)}</td>
                    <td className="max-w-48 truncate px-1 py-3 font-medium">
                      <Link href={`${routes.workouts}/${w.id}`} className="hover:text-primary hover:underline">
                        {w.name}
                      </Link>
                    </td>
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

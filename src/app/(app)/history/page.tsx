import { ChevronRight, History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { sessionDurationMinutes } from "@/features/analytics/calculations";
import { requireUser } from "@/features/auth/queries";
import { HISTORY_PAGE_SIZE, listWorkoutHistory, type HistoryEntry } from "@/features/workouts/queries";
import { formatDateKey, toDateKey } from "@/lib/dates";
import { formatDuration, formatVolume } from "@/lib/format";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage({ searchParams }: PageProps<"/history">) {
  const params = await searchParams;
  const page = Math.max(1, Math.min(10_000, Number.parseInt(String(params.page ?? "1"), 10) || 1));
  const [user, { entries, total }] = await Promise.all([requireUser(), listWorkoutHistory(page)]);
  const pages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));

  // Group by month in the user's timezone.
  const groups = new Map<string, HistoryEntry[]>();
  for (const entry of entries) {
    const key = toDateKey(entry.startedAt, user.timeZone).slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  return (
    <div className="grid gap-5 lg:gap-6">
      <PageHeader title="Workout history" description={`${total} completed ${total === 1 ? "workout" : "workouts"}`} />

      {total === 0 ? (
        <EmptyState icon={History} title="No workouts yet">
          Finished workouts appear here.{" "}
          <Link href={routes.workout} className="font-medium text-primary hover:underline">
            Start one
          </Link>
        </EmptyState>
      ) : (
        [...groups].map(([month, items]) => (
          <section key={month} aria-labelledby={`m-${month}`} className="grid gap-2">
            <h2 id={`m-${month}`} className="text-sm font-semibold text-muted-foreground">
              {formatDateKey(`${month}-01`, { month: "long", year: "numeric" })}
            </h2>
            <ul className="grid gap-2">
              {items.map((w) => {
                const dateKey = toDateKey(w.startedAt, user.timeZone);
                return (
                  <li key={w.id}>
                    <Link
                      href={`${routes.workouts}/${w.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/40 sm:p-4"
                    >
                      <span className="grid w-12 shrink-0 place-items-center rounded-xl bg-secondary py-1.5 text-center">
                        <span className="text-[10px] font-medium uppercase text-muted-foreground">{formatDateKey(dateKey, { weekday: "short" })}</span>
                        <span className="text-lg font-semibold leading-tight tabular-nums">{formatDateKey(dateKey, { day: "numeric" })}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{w.name}</span>
                        <span className="block truncate text-xs text-muted-foreground tabular-nums">
                          {formatDuration(sessionDurationMinutes(w))} · {w.exerciseCount} exercises · {w.workingSetCount} sets
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">{formatVolume(w.volumeKg)}</span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {pages > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
          <Button asChild variant="outline" className="h-11 rounded-xl" aria-disabled={page <= 1}>
            <Link href={page > 1 ? `${routes.history}?page=${page - 1}` : "#"} className={page <= 1 ? "pointer-events-none opacity-50" : ""}>
              Newer
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            Page {page} of {pages}
          </span>
          <Button asChild variant="outline" className="h-11 rounded-xl" aria-disabled={page >= pages}>
            <Link href={page < pages ? `${routes.history}?page=${page + 1}` : "#"} className={page >= pages ? "pointer-events-none opacity-50" : ""}>
              Older
            </Link>
          </Button>
        </nav>
      ) : null}
    </div>
  );
}

import { formatDateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

import type { DashboardData } from "../queries";

export function WeekStrip({ days }: { days: DashboardData["weekDays"] }) {
  return (
    <ol className="grid grid-cols-7 gap-1.5" aria-label="This week">
      {days.map((day) => {
        const trained = day.workouts > 0;
        const label = formatDateKey(day.date, { weekday: "long", day: "numeric", month: "short" });
        return (
          <li key={day.date} className="flex flex-col items-center gap-1.5">
            <span className={cn("text-[11px] font-medium text-muted-foreground", day.isToday && "text-foreground")}>
              {formatDateKey(day.date, { weekday: "narrow" })}
            </span>
            <span
              title={`${label}: ${trained ? `${day.workouts} workout${day.workouts > 1 ? "s" : ""}` : "no workout"}`}
              className={cn(
                "grid size-9 place-items-center rounded-full border text-xs font-semibold tabular-nums transition-colors sm:size-10",
                trained ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
                !trained && day.isFuture && "border-dashed opacity-60",
                day.isToday && "ring-2 ring-primary/40 ring-offset-2 ring-offset-card",
              )}
            >
              {formatDateKey(day.date, { day: "numeric" })}
              <span className="sr-only">{trained ? `, ${day.workouts} workout` : ", no workout"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

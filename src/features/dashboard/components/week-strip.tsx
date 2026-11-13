import { formatDateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

import type { DashboardData } from "../queries";

export function WeekStrip({ days }: { days: DashboardData["weekDays"] }) {
  return (
    <ol className="grid grid-cols-7 gap-1.5 sm:gap-2" aria-label="This week">
      {days.map((day) => {
        const trained = day.workouts > 0;
        const label = formatDateKey(day.date, { weekday: "long", day: "numeric", month: "short" });
        return (
          <li key={day.date} className="flex flex-col gap-1.5">
            <span className={cn("eyebrow", day.isToday && "text-foreground")}>
              {formatDateKey(day.date, { weekday: "narrow" })}
            </span>
            <span
              title={`${label}: ${trained ? `${day.workouts} workout${day.workouts > 1 ? "s" : ""}` : "no workout"}`}
              className={cn(
                "grid h-12 place-items-center border text-sm font-medium tabular-nums transition-colors",
                trained ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
                !trained && day.isFuture && "border-dashed text-faint",
                day.isToday && !trained && "border-foreground text-foreground",
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

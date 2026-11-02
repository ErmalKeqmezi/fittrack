import { cn } from "@/lib/utils";

import { WEEKDAY_LABELS, WEEKDAY_SHORT, WEEKDAYS } from "../constants";

type ScheduleDay = { id: string; name: string; weekday: number | null; isRestDay: boolean };

/** Monday–Sunday overview of which plan day falls on each weekday. */
export function WeekSchedule({ days, compact = false }: { days: ScheduleDay[]; compact?: boolean }) {
  const byWeekday = new Map(days.filter((d) => d.weekday).map((d) => [d.weekday!, d]));

  return (
    <ol className="grid grid-cols-7 gap-1" aria-label="Weekly schedule">
      {WEEKDAYS.map((weekday) => {
        const day = byWeekday.get(weekday);
        const label = day ? (day.isRestDay ? "Rest" : day.name) : "—";
        return (
          <li
            key={weekday}
            title={`${WEEKDAY_LABELS[weekday]}: ${day ? label : "nothing scheduled"}`}
            className={cn(
              "flex min-w-0 flex-col items-center gap-1 rounded-lg border px-0.5 text-center",
              compact ? "py-1.5" : "py-2",
              day && !day.isRestDay
                ? "border-primary/40 bg-accent text-accent-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">{WEEKDAY_SHORT[weekday]}</span>
            <span className={cn("w-full truncate px-0.5 font-medium", compact ? "text-[10px]" : "text-[11px]")}>{label}</span>
            <span className="sr-only">{`${WEEKDAY_LABELS[weekday]}: ${day ? label : "nothing scheduled"}`}</span>
          </li>
        );
      })}
    </ol>
  );
}

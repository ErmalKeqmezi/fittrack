import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { formatDateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { monthKey, type MonthActivity } from "../month-activity";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function MonthLink({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  const className = "grid size-11 place-items-center rounded-lg text-muted-foreground transition-colors";
  if (!href) {
    return (
      <span aria-disabled className={cn(className, "opacity-30")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} scroll={false} className={cn(className, "hover:bg-secondary hover:text-foreground")}>
      {children}
    </Link>
  );
}

/** One month as a calendar, each day lit when a workout was finished on it. */
export function MonthActivityLog({
  activity,
  previousHref,
  nextHref,
}: {
  activity: MonthActivity;
  previousHref: string | null;
  nextHref: string | null;
}) {
  const first = `${monthKey(activity.year, activity.month)}-01`;
  const monthName = formatDateKey(first, { month: "long", year: "numeric" });

  return (
    <section aria-labelledby="monthly-activity" className="border-t border-border pt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="monthly-activity" className="flex items-center gap-2.5 text-xl leading-none font-semibold">
            <span aria-hidden className="h-4 w-1 shrink-0 bg-primary" />
            Monthly activity
          </h2>
          <div className="mt-2 -ml-3 flex items-center">
            <MonthLink href={previousHref} label="Previous month">
              <ChevronLeft className="size-5" aria-hidden />
            </MonthLink>
            <p className="min-w-0 truncate font-display text-2xl leading-none font-semibold tracking-[0.03em] uppercase">{monthName}</p>
            <MonthLink href={nextHref} label="Next month">
              <ChevronRight className="size-5" aria-hidden />
            </MonthLink>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-4xl leading-none font-medium text-primary tabular-nums">{activity.trainedDays}</p>
          <p className="eyebrow mt-2">{activity.trainedDays === 1 ? "Day trained" : "Days trained"}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAYS.map((day, i) => (
          <span key={i} aria-hidden className="eyebrow pb-0.5 text-center">
            {day}
          </span>
        ))}
        {activity.cells.map((cell, i) =>
          cell ? (
            <span
              key={cell.date}
              title={`${formatDateKey(cell.date, { weekday: "long", day: "numeric", month: "long" })}${cell.trained ? ": trained" : ""}`}
              className={cn(
                "grid h-11 place-items-center border text-sm font-medium tabular-nums sm:h-12",
                cell.trained
                  ? "border-primary bg-primary text-primary-foreground"
                  : cell.isFuture
                    ? "border-dashed border-border text-faint"
                    : "border-border text-muted-foreground",
                cell.isToday && !cell.trained && "border-foreground text-foreground",
                cell.isToday && cell.trained && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
              )}
            >
              {cell.day}
              <span className="sr-only">
                {" "}
                {formatDateKey(cell.date, { weekday: "long", month: "long" })}
                {cell.trained ? ", trained" : ""}
              </span>
            </span>
          ) : (
            <span key={`blank-${i}`} aria-hidden />
          ),
        )}
      </div>
    </section>
  );
}

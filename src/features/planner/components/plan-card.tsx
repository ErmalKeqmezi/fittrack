import { ChevronRight, CircleCheck } from "lucide-react";
import Link from "next/link";

import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

import type { Plan } from "../types";
import { WeekSchedule } from "./week-schedule";

export function PlanCard({ plan }: { plan: Plan }) {
  const trainingDays = plan.days.filter((d) => !d.isRestDay);
  const exerciseCount = trainingDays.reduce((sum, d) => sum + d.exercises.length, 0);

  return (
    <Link
      href={`${routes.plans}/${plan.id}`}
      className={cn(
        "group grid gap-4 rounded-2xl border bg-card p-4 transition-colors sm:p-5",
        "hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-ring",
        plan.isActive ? "border-primary/50 ring-1 ring-primary/20" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold">{plan.name}</h3>
            {plan.isActive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-brand-soft">
                <CircleCheck className="size-3" aria-hidden /> Active
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {trainingDays.length} training {trainingDays.length === 1 ? "day" : "days"} · {exerciseCount}{" "}
            {exerciseCount === 1 ? "exercise" : "exercises"}
          </p>
        </div>
        <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
      </div>
      {plan.days.length ? (
        <WeekSchedule days={plan.days} compact />
      ) : (
        <p className="text-sm text-muted-foreground">No days yet. Open the plan to add some.</p>
      )}
    </Link>
  );
}

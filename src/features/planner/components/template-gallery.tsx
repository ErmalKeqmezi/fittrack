"use client";

import { LayoutTemplate, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { createPlanFromTemplate } from "../actions";
import { PLAN_TEMPLATES } from "../templates";
import { WeekSchedule } from "./week-schedule";

export function TemplateGallery() {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function applyTemplate(key: string) {
    setPendingKey(key);
    startTransition(async () => {
      // Redirects to the new plan on success.
      const result = await createPlanFromTemplate(key);
      if (!result.ok) toast.error(result.message);
      setPendingKey(null);
    });
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {PLAN_TEMPLATES.map((template) => {
        const scheduleDays = template.days.map((d, i) => ({ id: String(i), name: d.name, weekday: d.weekday, isRestDay: !!d.isRestDay }));
        const busy = pending && pendingKey === template.key;
        return (
          <li key={template.key} className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary">
                <LayoutTemplate className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold">{template.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {template.daysPerWeek} days/week · {template.level}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{template.summary}</p>
            <WeekSchedule days={scheduleDays} compact />
            <Button
              variant="outline"
              className="h-11 rounded-xl"
              disabled={pending}
              onClick={() => applyTemplate(template.key)}
            >
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {busy ? "Creating plan…" : "Use this template"}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

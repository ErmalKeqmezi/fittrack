"use client";

import { CircleCheck, Power } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { setActivePlan } from "../actions";

export function ActivePlanToggle({ planId, isActive, className }: { planId: string; isActive: boolean; className?: string }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await setActivePlan(planId, !isActive);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <Button
      variant={isActive ? "outline" : "default"}
      className={cn("h-11 rounded-xl px-4", className)}
      disabled={pending}
      onClick={toggle}
      aria-pressed={isActive}
    >
      {isActive ? <Power aria-hidden /> : <CircleCheck aria-hidden />}
      {isActive ? "Deactivate" : "Set as active plan"}
    </Button>
  );
}

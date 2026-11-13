"use client";

import { Loader2, Play } from "lucide-react";
import { useTransition, type ComponentProps } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { offline } from "@/lib/offline";

import { startWorkout } from "../actions";

/** Starts a workout from a plan day (or an empty one) and opens the tracker. */
export function StartWorkoutButton({
  dayId,
  children,
  className,
  variant,
}: {
  dayId: string | null;
  children: React.ReactNode;
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant={variant}
      className={cn("h-12 rounded-xl px-5 text-base font-semibold", className)}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await startWorkout(dayId).catch(offline);
          if (!result.ok) toast.error(result.message);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Play aria-hidden />}
      {children}
    </Button>
  );
}

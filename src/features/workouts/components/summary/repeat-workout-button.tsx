"use client";

import { Repeat2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

import { repeatWorkout } from "../../actions";

export function RepeatWorkoutButton({ sessionId, className }: { sessionId: string; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function repeat() {
    startTransition(async () => {
      const result = await repeatWorkout(sessionId).catch(() => ({
        ok: false as const,
        message: "No connection. Try again when online.",
      }));
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      if (result.resumed) toast("You already have a workout in progress, so we opened it.");
      router.push(`${routes.workouts}/${result.sessionId}`);
    });
  }

  return (
    <Button type="button" onClick={repeat} disabled={pending} className={className}>
      <Repeat2 aria-hidden /> {pending ? "Starting…" : "Repeat Workout"}
    </Button>
  );
}

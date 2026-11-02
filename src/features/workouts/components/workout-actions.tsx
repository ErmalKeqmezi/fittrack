"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { ConfirmAction } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

import { deleteWorkout } from "../actions";

export function WorkoutActions({ sessionId, name }: { sessionId: string; name: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" className="h-11 rounded-xl px-4">
        <Link href={`${routes.workouts}/${sessionId}/edit`}>
          <Pencil aria-hidden /> Edit
        </Link>
      </Button>
      <ConfirmAction
        title={`Delete “${name}”?`}
        description="The workout and all its sets are permanently removed from your history and statistics."
        confirmLabel="Delete workout"
        onConfirm={() =>
          startTransition(async () => {
            const result = await deleteWorkout(sessionId);
            if (!result.ok) toast.error(result.message);
          })
        }
        trigger={
          <Button variant="destructive" className="h-11 rounded-xl px-4" disabled={pending}>
            <Trash2 aria-hidden /> Delete
          </Button>
        }
      />
    </div>
  );
}

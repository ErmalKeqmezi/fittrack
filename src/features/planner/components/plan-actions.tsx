"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmAction } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { offline } from "@/lib/offline";

import { deletePlan, updatePlanDetails } from "../actions";
import { PlanDetailsForm } from "./plan-details-form";

export function PlanActions({ planId, name, description }: { planId: string; name: string; description: string | null }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const closeEditor = useCallback(() => setEditing(false), []);

  function remove() {
    startTransition(async () => {
      // Redirects to the plans list on success.
      const result = await deletePlan(planId).catch(offline);
      if (!result.ok) toast.error(result.message);
    });
  }

  return (
    <>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogTrigger asChild>
          <Button variant="outline" className="h-11 rounded-xl px-4">
            <Pencil aria-hidden /> Rename
          </Button>
        </DialogTrigger>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Plan details</DialogTitle>
          </DialogHeader>
          <PlanDetailsForm
            action={updatePlanDetails.bind(null, planId)}
            defaults={{ name, description }}
            submitLabel="Save"
            onSaved={closeEditor}
          />
        </DialogContent>
      </Dialog>
      <ConfirmAction
        title={`Delete “${name}”?`}
        description="The plan, its days and targets are removed. Your logged workouts stay in your history."
        confirmLabel="Delete plan"
        onConfirm={remove}
        trigger={
          <Button variant="destructive" className="h-11 rounded-xl px-4" disabled={pending}>
            <Trash2 aria-hidden /> Delete
          </Button>
        }
      />
    </>
  );
}

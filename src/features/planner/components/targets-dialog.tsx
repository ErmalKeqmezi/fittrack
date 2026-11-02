"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { NativeSelect } from "@/components/forms/native-select";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useFormAction } from "@/hooks/use-form-action";

import { movePlanExercise, removePlanExercise, updatePlanExercise, type TargetsFormState } from "../actions";
import { formatRest, REST_PRESETS } from "../constants";
import type { PlanExercise } from "../types";

const initialState: TargetsFormState = { status: "idle" };

export function TargetsDialog({
  item,
  isFirst,
  isLast,
  trigger,
}: {
  item: PlanExercise;
  isFirst: boolean;
  isLast: boolean;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item.exercise.name}</DialogTitle>
          <DialogDescription>Targets guide your session. You always log what you actually did.</DialogDescription>
        </DialogHeader>
        <TargetsForm item={item} isFirst={isFirst} isLast={isLast} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function TargetsForm({ item, isFirst, isLast, onDone }: { item: PlanExercise; isFirst: boolean; isLast: boolean; onDone: () => void }) {
  const { state, pending, formProps } = useFormAction(updatePlanExercise.bind(null, item.id), initialState);
  const [busy, startTransition] = useTransition();
  const errors = state.fieldErrors ?? {};
  const restOptions = [...new Set([...REST_PRESETS, ...(item.restSeconds != null ? [item.restSeconds] : [])])].sort((a, b) => a - b);

  useEffect(() => {
    if (state.status === "success") {
      if (state.message) toast.success(state.message);
      onDone();
    }
  }, [state, onDone]);

  function run(fn: () => Promise<{ ok: boolean; message?: string }>, closeAfter = false) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) toast.error(result.message);
      else if (result.message) toast.success(result.message);
      if (result.ok && closeAfter) onDone();
    });
  }

  const numberProps = { type: "number", inputMode: "numeric" as const, min: 1, className: "text-center text-lg font-semibold tabular-nums md:text-lg" };

  return (
    <div className="grid gap-5">
      <form {...formProps} className="grid gap-4" noValidate>
        {state.status === "error" && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
        <div className="grid grid-cols-3 gap-3">
          <FormField name="targetSets" label="Sets" max={20} defaultValue={item.targetSets} error={errors.targetSets} {...numberProps} />
          <FormField name="targetRepsMin" label="Min reps" max={100} defaultValue={item.targetRepsMin} error={errors.targetRepsMin} {...numberProps} />
          <FormField name="targetRepsMax" label="Max reps" max={100} defaultValue={item.targetRepsMax} error={errors.targetRepsMax} {...numberProps} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="restSeconds">Rest between sets</Label>
          <NativeSelect id="restSeconds" name="restSeconds" defaultValue={item.restSeconds ?? ""}>
            <option value="">No target</option>
            {restOptions.map((s) => (
              <option key={s} value={s}>
                {formatRest(s)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <FormField
          name="notes"
          label="Notes (optional)"
          maxLength={500}
          autoComplete="off"
          placeholder="e.g. pause at the bottom"
          defaultValue={item.notes ?? ""}
          error={errors.notes}
        />
        <SubmitButton pending={pending} pendingLabel="Saving…">
          Save targets
        </SubmitButton>
      </form>

      <div className="grid gap-2 border-t border-border pt-4">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11 rounded-xl" disabled={busy || isFirst} onClick={() => run(() => movePlanExercise(item.id, -1))}>
            <ArrowUp aria-hidden /> Move up
          </Button>
          <Button variant="outline" className="h-11 rounded-xl" disabled={busy || isLast} onClick={() => run(() => movePlanExercise(item.id, 1))}>
            <ArrowDown aria-hidden /> Move down
          </Button>
        </div>
        <Button variant="destructive" className="h-11 rounded-xl" disabled={busy} onClick={() => run(() => removePlanExercise(item.id), true)}>
          <Trash2 aria-hidden /> Remove from day
        </Button>
      </div>
    </div>
  );
}

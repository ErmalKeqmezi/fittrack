"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { ConfirmAction } from "@/components/confirm-button";
import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { NativeSelect } from "@/components/forms/native-select";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useFormAction } from "@/hooks/use-form-action";

import { addDay, deleteDay, moveDay, updateDay, type DayFormState } from "../actions";
import { WEEKDAY_LABELS, WEEKDAYS } from "../constants";
import type { PlanDay } from "../types";

const initialState: DayFormState = { status: "idle" };

type DayDialogProps = {
  trigger: ReactNode;
  /** Weekdays already used by other days, to show what a change will replace. */
  takenWeekdays: Map<number, string>;
} & ({ mode: "add"; planId: string } | { mode: "edit"; day: PlanDay; isFirst: boolean; isLast: boolean });

export function DayDialog(props: DayDialogProps) {
  const [open, setOpen] = useState(false);
  const title = props.mode === "add" ? "Add day" : "Edit day";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{props.trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Assign a weekday to show it as today&apos;s workout on that day. Leave it unscheduled to train it whenever.
          </DialogDescription>
        </DialogHeader>
        <DayForm {...props} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function DayForm(props: DayDialogProps & { onDone: () => void }) {
  const day = props.mode === "edit" ? props.day : null;
  const action = props.mode === "add" ? addDay.bind(null, props.planId) : updateDay.bind(null, props.day.id);
  const { state, pending, formProps } = useFormAction(action, initialState);
  const [weekday, setWeekday] = useState<string>(day?.weekday ? String(day.weekday) : "");
  const [isRestDay, setIsRestDay] = useState(day?.isRestDay ?? false);
  const [busy, startTransition] = useTransition();
  const { onDone } = props;

  useEffect(() => {
    if (state.status === "success") {
      if (state.message) toast.success(state.message);
      onDone();
    }
  }, [state, onDone]);

  const takenBy = weekday ? props.takenWeekdays.get(Number(weekday)) : undefined;
  const losingExercises = day && isRestDay && !day.isRestDay ? day.exercises.length : 0;

  function run(fn: () => Promise<{ ok: boolean; message?: string }>, closeAfter = false) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) toast.error(result.message);
      else if (result.message) toast.success(result.message);
      if (result.ok && closeAfter) onDone();
    });
  }

  return (
    <div className="grid gap-5">
      <form {...formProps} className="grid gap-4" noValidate>
        {state.status === "error" && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
        <FormField
          name="name"
          label="Name"
          required
          maxLength={60}
          autoComplete="off"
          placeholder="e.g. Push, Upper A, Legs"
          defaultValue={day?.name}
          error={state.fieldErrors?.name}
        />
        <div className="grid gap-2">
          <Label htmlFor="weekday">Weekday</Label>
          <NativeSelect id="weekday" name="weekday" value={weekday} onChange={(e) => setWeekday(e.target.value)}>
            <option value="">Unscheduled</option>
            {WEEKDAYS.map((w) => (
              <option key={w} value={w}>
                {WEEKDAY_LABELS[w]}
              </option>
            ))}
          </NativeSelect>
          {takenBy ? (
            <p className="text-xs text-muted-foreground">
              {WEEKDAY_LABELS[Number(weekday) as keyof typeof WEEKDAY_LABELS]} is currently “{takenBy}”. Saving moves
              it to this day and leaves “{takenBy}” unscheduled.
            </p>
          ) : null}
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border px-3.5 py-2.5">
          <input
            type="checkbox"
            name="isRestDay"
            checked={isRestDay}
            onChange={(e) => setIsRestDay(e.target.checked)}
            className="size-5 accent-primary"
          />
          <span className="grid">
            <span className="text-sm font-medium">Rest day</span>
            <span className="text-xs text-muted-foreground">Recovery day with no exercises.</span>
          </span>
        </label>
        {losingExercises ? (
          <FormMessage tone="error">
            Making this a rest day removes its {losingExercises} planned {losingExercises === 1 ? "exercise" : "exercises"}.
          </FormMessage>
        ) : null}
        <SubmitButton pending={pending} pendingLabel="Saving…">
          {props.mode === "add" ? "Add day" : "Save day"}
        </SubmitButton>
      </form>

      {props.mode === "edit" ? (
        <div className="grid gap-2 border-t border-border pt-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-11 rounded-xl"
              disabled={busy || props.isFirst}
              onClick={() => run(() => moveDay(props.day.id, -1))}
            >
              <ArrowUp aria-hidden /> Move up
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-xl"
              disabled={busy || props.isLast}
              onClick={() => run(() => moveDay(props.day.id, 1))}
            >
              <ArrowDown aria-hidden /> Move down
            </Button>
          </div>
          <ConfirmAction
            title={`Delete “${props.day.name}”?`}
            description="The day and its planned exercises are removed from this plan. Logged workouts are not affected."
            confirmLabel="Delete day"
            onConfirm={() => run(() => deleteDay(props.day.id), true)}
            trigger={
              <Button variant="destructive" className="h-11 rounded-xl" disabled={busy}>
                <Trash2 aria-hidden /> Delete day
              </Button>
            }
          />
        </div>
      ) : null}
    </div>
  );
}

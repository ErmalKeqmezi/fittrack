"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { ConfirmAction } from "@/components/confirm-button";
import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useFormAction } from "@/hooks/use-form-action";
import { offline } from "@/lib/offline";

import { deleteMeasurement, saveMeasurement, type MeasurementState } from "../actions";
import { METRIC_GROUPS, METRICS, type Measurement, type MeasurementValues } from "../constants";

const initialState: MeasurementState = { status: "idle" };

type Props = {
  trigger: ReactNode;
  today: string;
  /** Latest values, shown as hints in empty fields. */
  latest: MeasurementValues;
  /** The entry being edited; omit to log a new one. */
  entry?: Measurement;
};

export function MeasurementDialog({ trigger, today, latest, entry }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex max-h-[88dvh] flex-col gap-4 overflow-y-auto overscroll-contain rounded-2xl p-5 sm:max-w-lg sm:p-6">
        <DialogHeader className="pr-10 text-left">
          <DialogTitle className="text-base">{entry ? "Edit measurements" : "Log measurements"}</DialogTitle>
          <DialogDescription>Fill in only what you measured. Everything is optional except the date.</DialogDescription>
        </DialogHeader>
        {open ? <MeasurementForm today={today} latest={latest} entry={entry} onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function MeasurementForm({ today, latest, entry, onDone }: Omit<Props, "trigger"> & { onDone: () => void }) {
  const { state, pending, formProps } = useFormAction(saveMeasurement.bind(null, entry?.id ?? null), initialState);
  const [deleting, startDelete] = useTransition();
  const errors = state.errors ?? {};

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      onDone();
    }
    // onDone only closes the dialog, so a new function identity is not a new result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function remove() {
    if (!entry) return;
    startDelete(async () => {
      const result = await deleteMeasurement(entry.id).catch(offline);
      if (result.ok) {
        toast.success(result.message);
        onDone();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <form {...formProps} className="grid gap-5" noValidate>
      {state.status === "error" && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
      <FormField
        name="measured_on"
        label="Date"
        type="date"
        max={today}
        defaultValue={entry?.measured_on ?? today}
        required
        error={errors.measured_on}
      />
      {METRIC_GROUPS.map((group) => (
        <fieldset key={group} className="grid gap-3">
          <legend className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{group}</legend>
          <div className="grid grid-cols-2 gap-3">
            {METRICS.filter((m) => m.group === group).map((metric) => (
              <FormField
                key={metric.key}
                name={metric.key}
                label={`${metric.label} (${metric.unit})`}
                inputMode="decimal"
                autoComplete="off"
                defaultValue={entry?.[metric.key] ?? ""}
                placeholder={latest[metric.key]?.toString() ?? ""}
                error={errors[metric.key]}
              />
            ))}
          </div>
        </fieldset>
      ))}
      <SubmitButton pending={pending} pendingLabel="Saving…">
        Save measurements
      </SubmitButton>
      {entry ? (
        <ConfirmAction
          title="Delete this entry?"
          description="All measurements from this date are permanently removed."
          confirmLabel="Delete entry"
          onConfirm={remove}
          trigger={
            <Button type="button" variant="destructive" className="h-11 rounded-xl" disabled={deleting}>
              <Trash2 aria-hidden /> Delete entry
            </Button>
          }
        />
      ) : null}
    </form>
  );
}

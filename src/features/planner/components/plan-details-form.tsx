"use client";

import Link from "next/link";
import { useEffect } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/hooks/use-form-action";

import type { PlanFormState } from "../actions";

const initialState: PlanFormState = { status: "idle" };

export function PlanDetailsForm({
  action,
  defaults,
  submitLabel,
  cancelHref,
  onSaved,
}: {
  action: (prev: PlanFormState, formData: FormData) => Promise<PlanFormState>;
  defaults?: { name: string; description: string | null };
  submitLabel: string;
  cancelHref?: string;
  onSaved?: () => void;
}) {
  const { state, pending, formProps } = useFormAction(action, initialState);

  useEffect(() => {
    if (state.status === "success") {
      if (state.message) toast.success(state.message);
      onSaved?.();
    }
  }, [state, onSaved]);

  return (
    <form {...formProps} className="grid gap-5" noValidate>
      {state.status === "error" && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
      <FormField
        name="name"
        label="Plan name"
        required
        maxLength={80}
        autoComplete="off"
        placeholder="e.g. Summer strength block"
        defaultValue={defaults?.name}
        error={state.fieldErrors?.name}
      />
      <div className="grid gap-2">
        <Label htmlFor="description">
          Description <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="description"
          name="description"
          maxLength={1000}
          rows={3}
          defaultValue={defaults?.description ?? ""}
          placeholder="Goal, progression notes…"
          className="min-h-20 rounded-xl px-3.5 py-3"
        />
        {state.fieldErrors?.description ? <p className="text-sm text-destructive">{state.fieldErrors.description}</p> : null}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {cancelHref ? (
          <Button asChild variant="ghost" className="h-11 rounded-xl px-5">
            <Link href={cancelHref}>Cancel</Link>
          </Button>
        ) : null}
        <SubmitButton pending={pending} pendingLabel="Saving…" className="sm:w-auto sm:px-6">
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}

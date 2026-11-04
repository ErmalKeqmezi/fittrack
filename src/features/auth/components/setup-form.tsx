"use client";

import { useActionState } from "react";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";

import { setupAccount, type SetupState } from "../actions";

const initialState: SetupState = { status: "idle" };

export function SetupForm() {
  const [state, formAction] = useActionState(setupAccount, initialState);

  // Capture the device timezone so days and weeks match the user's local calendar.
  function submit(formData: FormData) {
    formData.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
    formAction(formData);
  }

  if (state.status === "success" && state.needsEmailConfirmation) {
    return <FormMessage tone="success">{state.message}</FormMessage>;
  }

  return (
    <form action={submit} className="grid gap-4" noValidate>
      {state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
      <FormField
        name="displayName"
        label="Your name"
        autoComplete="name"
        required
        maxLength={60}
        defaultValue={state.values?.displayName}
        error={state.fieldErrors?.displayName}
      />
      <FormField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <FormField
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 10 characters with upper- and lowercase letters and a number."
        error={state.fieldErrors?.password}
      />
      <FormField
        name="confirmPassword"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirmPassword}
      />
      <SubmitButton pendingLabel="Creating account…" className="mt-2">
        Create account
      </SubmitButton>
    </form>
  );
}

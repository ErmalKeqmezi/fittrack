"use client";

import { useActionState } from "react";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";

import { signIn, type LoginState } from "../actions";

const initialState: LoginState = { status: "idle" };

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, formAction] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : notice ? (
        <FormMessage tone="error">{notice}</FormMessage>
      ) : null}
      {next ? <input type="hidden" name="next" value={next} /> : null}
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
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      <SubmitButton pendingLabel="Signing in…" className="mt-2">
        Sign in
      </SubmitButton>
    </form>
  );
}

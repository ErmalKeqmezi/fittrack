"use client";

import { startTransition, useActionState, type FormEvent } from "react";

/**
 * useActionState for forms that must keep their values after submitting.
 *
 * Spread the result's `formProps` onto the <form>:
 * - `action` makes the form post to the Server Action even before hydration
 *   (otherwise an early tap would do a native GET with the values in the URL).
 * - `onSubmit` takes over once hydrated: it prevents the native submit and runs
 *   the action in a transition, which skips React's automatic form reset, so
 *   selects, toggles and typed values stay as the user left them on errors.
 */
export function useFormAction<State>(action: (state: Awaited<State>, formData: FormData) => State | Promise<State>, initialState: Awaited<State>) {
  const [state, formAction, pending] = useActionState(action, initialState);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return { state, pending, formProps: { action: formAction, onSubmit } };
}

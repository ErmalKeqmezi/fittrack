"use client";

import { LocateFixed } from "lucide-react";
import { startTransition, useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { updateProfile, type ProfileState } from "../actions";

const initialState: ProfileState = { status: "idle" };

export function ProfileForm({
  displayName,
  timeZone,
  timeZones,
}: {
  displayName: string | null;
  timeZone: string;
  timeZones: string[];
}) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  const [selectedTimeZone, setSelectedTimeZone] = useState(timeZone);

  // Submitting via onSubmit (not the action prop) skips React's automatic
  // form reset, which would revert the select to its server-rendered option.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
  }, [state]);

  function applyDeviceTimeZone() {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timeZones.includes(detected)) setSelectedTimeZone(detected);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
      {state.status === "error" && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
      <FormField
        name="displayName"
        label="Name"
        autoComplete="name"
        maxLength={60}
        required
        defaultValue={displayName ?? ""}
        error={state.fieldErrors?.displayName}
      />
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="timeZone">Timezone</Label>
          <Button type="button" variant="link" size="sm" className="h-auto px-0 text-xs" onClick={applyDeviceTimeZone}>
            <LocateFixed aria-hidden /> Use this device&apos;s timezone
          </Button>
        </div>
        <select
          id="timeZone"
          name="timeZone"
          value={selectedTimeZone}
          onChange={(event) => setSelectedTimeZone(event.target.value)}
          aria-invalid={state.fieldErrors?.timeZone ? true : undefined}
          aria-describedby="timeZone-hint"
          className="h-11 w-full rounded-xl border border-input bg-input/30 px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        >
          {timeZones.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <p id="timeZone-hint" className="text-xs text-muted-foreground">
          {state.fieldErrors?.timeZone ?? "Used to group workouts into your local days and weeks."}
        </p>
      </div>
      <SubmitButton pending={pending} pendingLabel="Saving…" className="sm:w-fit sm:px-6">
        Save changes
      </SubmitButton>
    </form>
  );
}

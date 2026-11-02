"use client";

import { LocateFixed } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { NativeSelect } from "@/components/forms/native-select";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useFormAction } from "@/hooks/use-form-action";

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
  const { state, pending, formProps } = useFormAction(updateProfile, initialState);
  const [selectedTimeZone, setSelectedTimeZone] = useState(timeZone);

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
  }, [state]);

  function applyDeviceTimeZone() {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timeZones.includes(detected)) setSelectedTimeZone(detected);
  }

  return (
    <form {...formProps} className="grid gap-5" noValidate>
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
        <NativeSelect
          id="timeZone"
          name="timeZone"
          value={selectedTimeZone}
          onChange={(event) => setSelectedTimeZone(event.target.value)}
          aria-invalid={state.fieldErrors?.timeZone ? true : undefined}
          aria-describedby="timeZone-hint"
        >
          {timeZones.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replaceAll("_", " ")}
            </option>
          ))}
        </NativeSelect>
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

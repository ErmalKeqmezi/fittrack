"use client";

import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Submit button that disables itself and shows a spinner while its form is pending. */
export function SubmitButton({
  children,
  pendingLabel,
  pending: pendingOverride,
  className,
  ...props
}: ComponentProps<typeof Button> & {
  pendingLabel?: string;
  /** For forms submitted via onSubmit, where useFormStatus does not apply. */
  pending?: boolean;
}) {
  const formStatus = useFormStatus();
  const pending = pendingOverride ?? formStatus.pending;

  return (
    <Button
      type="submit"
      disabled={pending || props.disabled}
      aria-busy={pending}
      className={cn("h-11 w-full rounded-xl text-base font-semibold md:text-sm", className)}
      {...props}
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

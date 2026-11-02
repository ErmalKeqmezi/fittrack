import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = ComponentProps<typeof Input> & {
  name: string;
  label: string;
  error?: string;
  hint?: string;
};

/** Labelled input with accessible error/hint wiring, sized for touch. */
export function FormField({ name, label, error, hint, className, ...inputProps }: FormFieldProps) {
  const id = inputProps.id ?? name;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn("h-11 rounded-xl px-3.5 text-base md:text-sm", className)}
        {...inputProps}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

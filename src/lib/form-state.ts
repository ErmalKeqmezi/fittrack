import type { z } from "zod";

/** Result shape returned by Server Actions that back a form. */
export type FormState<TField extends string = string> = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<TField, string>>;
  values?: Partial<Record<TField, string>>;
};

export const idleFormState: FormState = { status: "idle" };

/** Converts a Zod error into the first message per field. */
export function toFieldErrors<TField extends string>(error: z.ZodError): Partial<Record<TField, string>> {
  const fieldErrors: Partial<Record<TField, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key as TField] = issue.message;
    }
  }
  return fieldErrors;
}

"use server";

import { redirect } from "next/navigation";

import { routes } from "@/config/routes";
import { env } from "@/lib/env";
import { toFieldErrors, type FormState } from "@/lib/form-state";
import { safeNextPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

import { isSetupComplete } from "./queries";
import { loginSchema, setupSchema, type LoginInput, type SetupInput } from "./schemas";

export type LoginState = FormState<keyof LoginInput>;
export type SetupState = FormState<keyof SetupInput> & { needsEmailConfirmation?: boolean };

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const raw = { email: formData.get("email"), password: formData.get("password") };
  const parsed = loginSchema.safeParse(raw);
  const values = { email: typeof raw.email === "string" ? raw.email : "" };

  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error), values };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    const message =
      error.code === "email_not_confirmed"
        ? "Confirm your email address first. Check your inbox for the link."
        : "Incorrect email or password.";
    return { status: "error", message, values };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function setupAccount(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const raw = {
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };
  const values = {
    displayName: typeof raw.displayName === "string" ? raw.displayName : "",
    email: typeof raw.email === "string" ? raw.email : "",
  };

  if (await isSetupComplete()) {
    return { status: "error", message: "FitTrack already has an owner account. Sign in instead." };
  }

  const parsed = setupSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error), values };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}${routes.authConfirm}?next=${routes.dashboard}`,
    },
  });

  if (error) {
    // The database trigger rejects any second account; surface that clearly.
    const message = /already has an owner|database error saving new user/i.test(error.message)
      ? "FitTrack already has an owner account. Sign in instead."
      : error.message;
    return { status: "error", message, values };
  }

  if (!data.session) {
    return {
      status: "success",
      needsEmailConfirmation: true,
      message: `We sent a confirmation link to ${parsed.data.email}. Open it on this device to finish setup.`,
    };
  }

  redirect(routes.dashboard);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(routes.login);
}

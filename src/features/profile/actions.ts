"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/features/auth/queries";
import { toFieldErrors, type FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

import { profileSchema, type ProfileInput } from "./schemas";

export type ProfileState = FormState<keyof ProfileInput>;

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Your session has expired. Sign in again." };

  const raw = { displayName: formData.get("displayName"), timeZone: formData.get("timeZone") };
  const values = {
    displayName: typeof raw.displayName === "string" ? raw.displayName : "",
    timeZone: typeof raw.timeZone === "string" ? raw.timeZone : "",
  };
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName, timezone: parsed.data.timeZone })
    .eq("id", user.id);

  if (error) return { status: "error", message: "Could not save your profile. Try again.", values };

  revalidatePath("/", "layout");
  return { status: "success", message: "Profile saved." };
}

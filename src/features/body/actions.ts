"use server";

import { revalidatePath } from "next/cache";

import { routes } from "@/config/routes";
import { getCurrentUser } from "@/features/auth/queries";
import { toDateKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

import { METRICS } from "./constants";
import { parseMeasurement, type MeasurementFieldErrors } from "./schemas";

export type MeasurementState = { status: "idle" | "error" | "success"; message?: string; errors?: MeasurementFieldErrors };
export type DeleteResult = { ok: boolean; message: string };

const SESSION_EXPIRED = "Your session has expired. Sign in again.";

/**
 * New entries merge into that day's entry if one exists, so logging weight in
 * the morning and arms at night gives one row. Editing replaces the entry, so
 * a cleared field is removed.
 */
export async function saveMeasurement(entryId: string | null, _prev: MeasurementState, formData: FormData): Promise<MeasurementState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: SESSION_EXPIRED };
  if (entryId !== null && !isUuid(entryId)) return { status: "error", message: "Unknown entry." };

  const parsed = parseMeasurement(Object.fromEntries(formData), toDateKey(new Date(), user.timeZone));
  if (!parsed.ok) {
    const { form, ...errors } = parsed.errors;
    return { status: "error", message: form, errors };
  }
  const { measured_on, values } = parsed.data;

  const supabase = await createClient();
  if (entryId) {
    const { data, error } = await supabase.from("body_measurements").update({ measured_on, ...values }).eq("id", entryId).select("id");
    if (error?.code === "23505") {
      return { status: "error", errors: { measured_on: "You already have an entry for that date. Edit that one instead." } };
    }
    if (error || !data.length) return { status: "error", message: "Could not save. Try again." };
  } else {
    const filled = Object.fromEntries(METRICS.filter((m) => values[m.key] !== null).map((m) => [m.key, values[m.key]]));
    const { error } = await supabase
      .from("body_measurements")
      .upsert({ user_id: user.id, measured_on, ...filled }, { onConflict: "user_id,measured_on" });
    if (error) return { status: "error", message: "Could not save. Try again." };
  }

  revalidatePath(routes.body);
  return { status: "success", message: "Measurements saved." };
}

export async function deleteMeasurement(entryId: string): Promise<DeleteResult> {
  if (!(await getCurrentUser())) return { ok: false, message: SESSION_EXPIRED };
  if (!isUuid(entryId)) return { ok: false, message: "Unknown entry." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("body_measurements").delete().eq("id", entryId).select("id");
  if (error || !data.length) return { ok: false, message: "Could not delete the entry." };

  revalidatePath(routes.body);
  return { ok: true, message: "Entry deleted." };
}

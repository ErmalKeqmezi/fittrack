import "server-only";

import { toDateKey, type DateKey } from "@/lib/dates";
import { readAllPages } from "@/lib/supabase/read-all";
import { createClient } from "@/lib/supabase/server";

import { monthKey } from "./month-activity";

/**
 * Days with a finished workout in one month, in the user's timezone, and the
 * month of the first workout ever (for the month switcher).
 */
export async function getTrainingDays(year: number, month: number, timeZone: string): Promise<{ days: Set<DateKey>; firstMonth: string | null }> {
  const supabase = await createClient();
  // A day either side, so workouts near midnight land in the right local month.
  const from = new Date(Date.UTC(year, month - 1, 1) - 86_400_000).toISOString();
  const to = new Date(Date.UTC(year, month, 1) + 86_400_000).toISOString();

  const [rows, first] = await Promise.all([
    readAllPages("your activity", (pageFrom, pageTo) =>
      supabase
        .from("workout_sessions")
        .select("id, started_at")
        .eq("status", "completed")
        .gte("started_at", from)
        .lt("started_at", to)
        .order("started_at")
        .order("id")
        .range(pageFrom, pageTo),
    ),
    supabase.from("workout_sessions").select("started_at").eq("status", "completed").order("started_at").limit(1).maybeSingle(),
  ]);
  if (first.error) throw new Error(`Could not load your activity: ${first.error.message}`);

  const prefix = `${monthKey(year, month)}-`;
  const days = new Set(rows.map((r) => toDateKey(r.started_at, timeZone)).filter((d) => d.startsWith(prefix)));
  return { days, firstMonth: first.data ? toDateKey(first.data.started_at, timeZone).slice(0, 7) : null };
}

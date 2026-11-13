import "server-only";

import { readAllPages } from "@/lib/supabase/read-all";
import { createClient } from "@/lib/supabase/server";

import { METRICS, type Measurement } from "./constants";

/** The signed-in user's entries, newest first. Row Level Security scopes the query. */
export async function listMeasurements(): Promise<Measurement[]> {
  const supabase = await createClient();
  // One entry per day adds up: daily weigh-ins pass 1000 rows in under three years.
  const data = await readAllPages("body measurements", (from, to) =>
    supabase
      .from("body_measurements")
      .select(`id, measured_on, ${METRICS.map((m) => m.key).join(", ")}`)
      .order("measured_on", { ascending: false })
      .range(from, to),
  );

  return (data as unknown as Record<string, string | number | null>[]).map((row) => {
    const entry = { id: row.id, measured_on: row.measured_on } as Measurement;
    for (const metric of METRICS) entry[metric.key] = row[metric.key] === null ? null : Number(row[metric.key]);
    return entry;
  });
}

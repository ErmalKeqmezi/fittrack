import "server-only";

import { createClient } from "@/lib/supabase/server";

import { METRICS, type Measurement } from "./constants";

/** The signed-in user's entries, newest first. Row Level Security scopes the query. */
export async function listMeasurements(): Promise<Measurement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("body_measurements")
    .select(`id, measured_on, ${METRICS.map((m) => m.key).join(", ")}`)
    .order("measured_on", { ascending: false });
  if (error) throw new Error(`Could not load body measurements: ${error.message}`);

  return (data as unknown as Record<string, string | number | null>[]).map((row) => {
    const entry = { id: row.id, measured_on: row.measured_on } as Measurement;
    for (const metric of METRICS) entry[metric.key] = row[metric.key] === null ? null : Number(row[metric.key]);
    return entry;
  });
}

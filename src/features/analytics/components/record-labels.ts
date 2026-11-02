import { formatKg } from "@/lib/format";

import type { RecordType } from "../queries";

export const RECORD_LABELS: Record<RecordType, { title: string; kind: "Actual" | "Estimated" }> = {
  max_weight: { title: "Heaviest weight", kind: "Actual" },
  max_reps: { title: "Most reps", kind: "Actual" },
  best_e1rm: { title: "Best est. 1RM", kind: "Estimated" },
};

export const RECORD_ORDER: RecordType[] = ["max_weight", "max_reps", "best_e1rm"];

/** Headline and supporting text for a record. */
export function describeRecord(r: { type: RecordType; value: number; weightKg: number; reps: number }) {
  switch (r.type) {
    case "max_weight":
      return { headline: formatKg(r.weightKg), detail: `× ${r.reps} ${r.reps === 1 ? "rep" : "reps"}` };
    case "max_reps":
      return { headline: `${r.reps} reps`, detail: r.weightKg > 0 ? `@ ${formatKg(r.weightKg)}` : "bodyweight" };
    case "best_e1rm":
      return { headline: formatKg(r.value), detail: `from ${formatKg(r.weightKg)} × ${r.reps}` };
  }
}

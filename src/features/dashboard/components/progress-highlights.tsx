import { ArrowDownRight, ArrowRight, ArrowUpRight, TrendingUp, Trophy } from "lucide-react";
import Link from "next/link";

import { EmptyState, Panel, PanelHeader } from "@/components/panel";
import { routes } from "@/config/routes";
import { formatDateKey, toDateKey } from "@/lib/dates";
import { formatKg, formatSignedKg } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { DashboardData } from "../queries";

const RECORD_LABELS = {
  max_weight: "Heaviest weight",
  max_reps: "Most reps",
  best_e1rm: "Best est. 1RM",
} as const;

function Change({ value, label }: { value: number | null; label: string }) {
  if (value == null) return <span className="text-xs text-muted-foreground">{label}: n/a</span>;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : ArrowRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
        value > 0 ? "text-brand-soft" : "text-muted-foreground",
      )}
    >
      <Icon className={cn("size-3.5", value > 0 && "text-primary")} aria-hidden />
      {label} {formatSignedKg(value)}
    </span>
  );
}

export function ProgressHighlights({ data }: { data: DashboardData }) {
  const dateOf = (iso: string) => formatDateKey(toDateKey(iso, data.timeZone), { day: "numeric", month: "short" });

  return (
    <Panel className="h-full">
      <PanelHeader
        title="Progression highlights"
        description="Latest session vs the one before, last 30 days"
        icon={TrendingUp}
      />
      {data.highlights.length === 0 ? (
        <EmptyState icon={TrendingUp} title="Not enough history yet">
          Train an exercise in two separate sessions to see how your top set and estimated 1RM change.
        </EmptyState>
      ) : (
        <ul className="grid gap-2.5">
          {data.highlights.map((h) => (
            <li key={h.exerciseId} className="rounded-xl border border-border bg-secondary/40 px-3.5 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm font-medium">{h.exerciseName}</p>
                <p className="shrink-0 text-xs text-muted-foreground">{dateOf(h.latest.startedAt)}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                Top set (actual): <span className="text-foreground">{formatKg(h.latest.topWeightKg)} × {h.latest.topWeightReps}</span>
                {" "}· previously {formatKg(h.previous.topWeightKg)} × {h.previous.topWeightReps}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <Change value={h.topWeightChangeKg} label="Top weight" />
                <Change value={h.e1rmChangeKg} label="Est. 1RM" />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Trophy className="size-3.5 text-primary" aria-hidden /> Latest personal records
          </p>
          {data.latestRecords.length ? (
            <Link href={routes.records} className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          ) : null}
        </div>
        {data.latestRecords.length === 0 ? (
          <p className="text-xs text-muted-foreground">No personal records yet. New bests appear here as you set them.</p>
        ) : (
          <ul className="grid gap-2">
            {data.latestRecords.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">
                  {r.exerciseName} <span className="text-xs text-muted-foreground">· {RECORD_LABELS[r.type]}</span>
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  {r.type === "max_reps" ? `${r.reps} reps` : formatKg(r.value)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

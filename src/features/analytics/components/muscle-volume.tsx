import { Crosshair } from "lucide-react";

import { EmptyState, Panel, PanelHeader } from "@/components/panel";

import type { MuscleVolume as MuscleVolumeEntry } from "../calculations";

/** Working sets per muscle group. A ranked bar list: names and values stay readable without colour. */
export function MuscleVolume({
  entries,
  untrained,
  showPerWeek,
  rangeLabel,
}: {
  entries: MuscleVolumeEntry[];
  untrained: string[];
  showPerWeek: boolean;
  rangeLabel: string;
}) {
  const metric = (e: MuscleVolumeEntry) => (showPerWeek ? e.setsPerWeek : e.sets);
  const max = Math.max(1, ...entries.map(metric));

  return (
    <Panel>
      <PanelHeader title="Sets per muscle group" description={showPerWeek ? `Average per week, ${rangeLabel}` : rangeLabel} icon={Crosshair} />
      {entries.length === 0 ? (
        <EmptyState icon={Crosshair} title="No sets in this period">
          Log working sets to see which muscles get the most work.
        </EmptyState>
      ) : (
        <>
          <ul className="grid gap-2.5 md:grid-cols-2 md:gap-x-8">
            {entries.map((entry) => (
              <li key={entry.id} className="grid grid-cols-[6.5rem_minmax(0,1fr)_3rem] items-center gap-2 text-sm">
                <span className="truncate">{entry.name}</span>
                <span aria-hidden className="h-2.5 overflow-hidden rounded-r-sm bg-secondary">
                  <span
                    className="block h-full origin-left rounded-r-sm bg-primary"
                    style={{ transform: `scaleX(${metric(entry) / max})` }}
                  />
                </span>
                <span className="text-right font-medium tabular-nums">{metric(entry)}</span>
              </li>
            ))}
          </ul>
          {untrained.length ? (
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Not trained:</span> {untrained.join(", ")}
            </p>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">
            Completed working sets. A set counts fully for an exercise&apos;s main muscle and as half for its secondary muscles.
          </p>
        </>
      )}
    </Panel>
  );
}

import { ChevronRight, History, PersonStanding, Plus, Ruler } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, Panel, PanelHeader } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { parseRange, rangeStart } from "@/features/analytics/calculations";
import { RangeTabs } from "@/features/analytics/components/range-tabs";
import { requireUser } from "@/features/auth/queries";
import { currentMetrics, loggedMetrics } from "@/features/body/calculations";
import { MeasurementDialog } from "@/features/body/components/measurement-dialog";
import { MetricChart } from "@/features/body/components/metric-chart";
import { formatMetric, METRIC_GROUPS, type MeasurementValues } from "@/features/body/constants";
import { listMeasurements } from "@/features/body/queries";
import { formatDateKey, toDateKey } from "@/lib/dates";

export const metadata: Metadata = { title: "Body" };

function signed(value: number, unit: "cm" | "kg" | "%") {
  return `${value > 0 ? "+" : "−"}${formatMetric(Math.abs(value), unit)}`;
}

export default async function BodyPage({ searchParams }: PageProps<"/body">) {
  const range = parseRange((await searchParams).range, "all");
  const [user, entries] = await Promise.all([requireUser(), listMeasurements()]);
  const today = toDateKey(new Date(), user.timeZone);
  const current = currentMetrics(entries);
  const latest = Object.fromEntries(current.map((c) => [c.metric.key, c.value])) as MeasurementValues;
  const shortDate = (date: string) => formatDateKey(date, { day: "numeric", month: "short" });

  return (
    <div className="grid gap-5 lg:gap-6">
      <PageHeader
        title="Body"
        description="Your measurements over time. Private to your account."
        actions={
          <MeasurementDialog
            today={today}
            latest={latest}
            trigger={
              <Button className="h-11 rounded-xl px-4">
                <Plus aria-hidden /> Log measurements
              </Button>
            }
          />
        }
      />

      {entries.length === 0 ? (
        <EmptyState icon={Ruler} title="No measurements yet">
          Log your height, weight and sizes such as biceps, chest and quads. Measure every few weeks to see how they change.
        </EmptyState>
      ) : (
        <>
          {METRIC_GROUPS.map((group) => {
            const metrics = current.filter((c) => c.metric.group === group);
            return (
              <section key={group} aria-labelledby={`group-${group}`} className="grid gap-2">
                <h2 id={`group-${group}`} className="text-sm font-semibold text-muted-foreground">
                  {group}
                </h2>
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {metrics.map(({ metric, value, measuredOn, change }) => (
                    <div key={metric.key} className="rounded-2xl border border-border bg-card p-4">
                      <dt className="text-xs font-medium text-muted-foreground">{metric.label}</dt>
                      <dd className="mt-1.5 text-xl font-semibold tracking-tight whitespace-nowrap tabular-nums">
                        {value === null ? <span className="text-muted-foreground">—</span> : formatMetric(value, metric.unit)}
                      </dd>
                      <dd className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
                        {measuredOn ? (
                          <>
                            {change ? `${signed(change, metric.unit)} · ` : ""}
                            {shortDate(measuredOn)}
                          </>
                        ) : (
                          "Not logged"
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}

          <Panel>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <PanelHeaderInline />
              <RangeTabs pathname={routes.body} current={range} />
            </div>
            <MetricChart entries={entries} from={rangeStart(range, today)} />
          </Panel>

          <Panel className="p-0 sm:p-0">
            <div className="p-4 pb-3 sm:px-5">
              <PanelHeader title="History" description="Tap an entry to edit or delete it" icon={History} />
            </div>
            <ul className="divide-y divide-border border-t border-border">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <MeasurementDialog
                    today={today}
                    latest={latest}
                    entry={entry}
                    trigger={
                      <button
                        type="button"
                        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50 active:bg-secondary sm:px-5"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{formatDateKey(entry.measured_on, { day: "numeric", month: "long", year: "numeric" })}</span>
                          <span className="block text-xs text-muted-foreground tabular-nums">
                            {loggedMetrics(entry)
                              .map(({ metric, value }) => `${metric.label} ${formatMetric(value, metric.unit)}`)
                              .join(" · ")}
                          </span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      </button>
                    }
                  />
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}
    </div>
  );
}

function PanelHeaderInline() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-primary">
        <PersonStanding className="size-4" aria-hidden />
      </span>
      <h2 className="text-base font-semibold">Trend</h2>
    </div>
  );
}

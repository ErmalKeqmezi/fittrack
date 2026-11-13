import { ChevronRight, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BackLink } from "@/components/layout/back-link";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, Panel, PanelHeader } from "@/components/panel";
import { routes } from "@/config/routes";
import { describeRecord, RECORD_LABELS, RECORD_ORDER } from "@/features/analytics/components/record-labels";
import { listPersonalRecords, type PersonalRecord } from "@/features/analytics/queries";
import { requireUser } from "@/features/auth/queries";
import { BODY_REGION_LABELS } from "@/features/exercises/constants";
import { formatDateKey, toDateKey } from "@/lib/dates";

export const metadata: Metadata = { title: "Personal records" };

export default async function RecordsPage() {
  const [user, records] = await Promise.all([requireUser(), listPersonalRecords()]);
  const dateOf = (iso: string) => formatDateKey(toDateKey(iso, user.timeZone), { day: "numeric", month: "short", year: "numeric" });

  const byExercise = new Map<string, { name: string; region: PersonalRecord["bodyRegion"]; latest: string; records: Map<string, PersonalRecord> }>();
  for (const r of records) {
    const entry = byExercise.get(r.exerciseId) ?? { name: r.exerciseName, region: r.bodyRegion, latest: r.achievedAt, records: new Map() };
    entry.records.set(r.type, r);
    if (r.achievedAt > entry.latest) entry.latest = r.achievedAt;
    byExercise.set(r.exerciseId, entry);
  }
  const exercises = [...byExercise].sort(([, a], [, b]) => b.latest.localeCompare(a.latest));
  const recent = records.slice(0, 6);

  return (
    <div className="grid gap-5 lg:gap-6">
      <BackLink href={routes.progress}>Progress</BackLink>
      <PageHeader
        title="Personal records"
        description="Detected automatically from completed working sets. Editing or deleting a workout updates them."
      />

      {records.length === 0 ? (
        <EmptyState icon={Trophy} title="No records yet">
          Your heaviest weight, most reps and best estimated 1RM per exercise appear here after your first workout.
        </EmptyState>
      ) : (
        <>
          <Panel>
            <PanelHeader title="Latest" description="Most recently set records" icon={Trophy} />
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {recent.map((r) => {
                const text = describeRecord(r);
                return (
                  <li key={r.id} className="rounded-xl border border-border bg-secondary/40 px-3.5 py-3">
                    <p className="truncate text-sm font-medium">{r.exerciseName}</p>
                    <p className="text-xs text-muted-foreground">
                      {RECORD_LABELS[r.type].title} · {dateOf(r.achievedAt)}
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {text.headline} <span className="text-xs font-normal text-muted-foreground">{text.detail}</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel>
            <div className="">
              <PanelHeader title="By exercise" description={`${exercises.length} exercises`} />
            </div>
            <div className="hidden grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))_1rem] gap-3 border-y border-border px-5 py-2 text-xs font-medium text-muted-foreground md:grid">
              <span>Exercise</span>
              {RECORD_ORDER.map((t) => (
                <span key={t}>
                  {RECORD_LABELS[t].title} <span className="opacity-70">({RECORD_LABELS[t].kind.toLowerCase()})</span>
                </span>
              ))}
              <span />
            </div>
            <ul className="divide-y divide-border border-t border-border md:border-t-0">
              {exercises.map(([exerciseId, entry]) => (
                <li key={exerciseId}>
                  <Link
                    href={`${routes.progress}/exercises/${exerciseId}?range=all`}
                    className="grid gap-2 px-4 py-3 transition-colors hover:bg-secondary/50 md:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))_1rem] md:items-center md:gap-3 md:px-5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{entry.name}</span>
                      {entry.region ? <span className="block text-xs text-muted-foreground">{BODY_REGION_LABELS[entry.region]}</span> : null}
                    </span>
                    {RECORD_ORDER.map((type) => {
                      const r = entry.records.get(type);
                      const text = r ? describeRecord(r) : null;
                      return (
                        <span key={type} className="flex items-baseline justify-between gap-2 md:block">
                          <span className="text-xs text-muted-foreground md:hidden">{RECORD_LABELS[type].title}</span>
                          <span className="text-right md:text-left">
                            <span className="text-sm font-semibold tabular-nums">{text?.headline ?? "—"}</span>
                            {r && text ? (
                              <span className="block text-xs text-muted-foreground">
                                {text.detail} · {dateOf(r.achievedAt)}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      );
                    })}
                    <ChevronRight className="hidden size-4 text-muted-foreground md:block" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}
    </div>
  );
}

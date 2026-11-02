import { BookOpen, History, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/layout/back-link";
import { Panel, PanelHeader } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { parseRange, RANGE_LABELS } from "@/features/analytics/calculations";
import { ChangeBadge } from "@/features/analytics/components/change-badge";
import { ExerciseProgressChart } from "@/features/analytics/components/exercise-progress-chart";
import { RangeTabs } from "@/features/analytics/components/range-tabs";
import { describeRecord, RECORD_LABELS, RECORD_ORDER } from "@/features/analytics/components/record-labels";
import { getExerciseProgress } from "@/features/analytics/queries";
import { requireUser } from "@/features/auth/queries";
import { getExercise } from "@/features/exercises/queries";
import { formatDateKey, toDateKey } from "@/lib/dates";
import { formatKg, formatVolume } from "@/lib/format";
import { isUuid } from "@/lib/uuid";

export async function generateMetadata({ params }: PageProps<"/progress/exercises/[id]">): Promise<Metadata> {
  const { id } = await params;
  const exercise = isUuid(id) ? await getExercise(id) : null;
  return { title: exercise ? `${exercise.name} progress` : "Progress" };
}

export default async function ExerciseProgressPage({ params, searchParams }: PageProps<"/progress/exercises/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const range = parseRange((await searchParams).range);

  const [user, exercise] = await Promise.all([requireUser(), getExercise(id)]);
  if (!exercise) notFound();
  const data = await getExerciseProgress(user, exercise.id, range);
  const dateOf = (iso: string) => formatDateKey(toDateKey(iso, user.timeZone), { day: "numeric", month: "short", year: "numeric" });
  const records = new Map(data.records.map((r) => [r.type, r]));
  const pathname = `${routes.progress}/exercises/${exercise.id}`;

  return (
    <div className="grid gap-5 lg:gap-6">
      <BackLink href={`${routes.progress}?range=${range}`}>Progress</BackLink>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">{exercise.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {exercise.primaryMuscle.name} · {data.totalSessions} logged {data.totalSessions === 1 ? "session" : "sessions"}
          </p>
        </div>
        <Button asChild variant="outline" className="h-11 rounded-xl px-4">
          <Link href={`${routes.exercises}/${exercise.id}`}>
            <BookOpen aria-hidden /> Exercise details
          </Link>
        </Button>
      </div>

      <section aria-labelledby="records-heading" className="grid gap-3">
        <h2 id="records-heading" className="flex items-center gap-2 text-sm font-semibold">
          <Trophy className="size-4 text-primary" aria-hidden /> All-time records
        </h2>
        <dl className="grid gap-3 sm:grid-cols-3">
          {RECORD_ORDER.map((type) => {
            const record = records.get(type);
            const label = RECORD_LABELS[type];
            const text = record ? describeRecord(record) : null;
            return (
              <div key={type} className="rounded-2xl border border-border bg-card p-4">
                <dt className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  {label.title}
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">{label.kind}</span>
                </dt>
                <dd className="mt-2 text-2xl font-semibold tabular-nums">{text?.headline ?? "—"}</dd>
                <dd className="text-xs text-muted-foreground">{record && text ? `${text.detail} · ${dateOf(record.achievedAt)}` : "Not logged yet"}</dd>
              </div>
            );
          })}
        </dl>
      </section>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Progression</h2>
            <p className="text-xs text-muted-foreground">
              {range === "all" ? "All sessions" : `Sessions in the last ${RANGE_LABELS[range].toLowerCase()}`} · {data.summary.sessions} logged
            </p>
          </div>
          <RangeTabs pathname={pathname} current={range} />
        </div>
        <ExerciseProgressChart points={data.points} timeZone={user.timeZone} exerciseName={exercise.name} />
        {data.summary.sessions ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Heaviest top set</dt>
              <dd className="font-semibold tabular-nums">
                {data.summary.bestTopSet ? `${formatKg(data.summary.bestTopSet.weightKg)} × ${data.summary.bestTopSet.reps}` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Top weight change</dt>
              <dd>
                <ChangeBadge value={data.summary.topWeightChangeKg} unit="kg" className="text-sm" />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Est. 1RM change</dt>
              <dd>
                <ChangeBadge value={data.summary.e1rmChangeKg} unit="kg" className="text-sm" />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Volume</dt>
              <dd className="font-semibold tabular-nums">{formatVolume(data.summary.volumeKg)}</dd>
            </div>
          </dl>
        ) : null}
      </Panel>

      <Panel className="p-0 sm:p-0">
        <div className="p-4 pb-3 sm:px-5">
          <PanelHeader title="Sessions" description="Newest first" icon={History} />
        </div>
        {data.points.length === 0 ? (
          <p className="px-4 pb-5 text-sm text-muted-foreground sm:px-5">No sessions in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y border-border text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 pl-4 text-left font-medium sm:pl-5">Date</th>
                  <th scope="col" className="py-2 text-right font-medium">Top set</th>
                  <th scope="col" className="hidden py-2 text-right font-medium sm:table-cell">Sets</th>
                  <th scope="col" className="py-2 text-right font-medium">Est. 1RM</th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium sm:pr-5">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...data.points].reverse().map((p) => (
                  <tr key={p.sessionId} className="hover:bg-secondary/40">
                    <td className="py-2.5 pl-4 sm:pl-5">
                      <Link href={`${routes.workouts}/${p.sessionId}`} className="hover:text-primary hover:underline">
                        {dateOf(p.startedAt)}
                      </Link>
                    </td>
                    <td className="py-2.5 text-right font-medium tabular-nums">
                      {formatKg(p.topWeightKg)} × {p.topWeightReps}
                    </td>
                    <td className="hidden py-2.5 text-right tabular-nums sm:table-cell">{p.workingSets}</td>
                    <td className="py-2.5 text-right text-muted-foreground tabular-nums">{p.bestE1rmKg !== null ? formatKg(p.bestE1rmKg) : "—"}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums sm:pr-5">{formatVolume(p.volumeKg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

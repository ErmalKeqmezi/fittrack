import { Dumbbell, History, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/layout/back-link";
import { EmptyState, Panel, PanelHeader } from "@/components/panel";
import { routes } from "@/config/routes";
import { requireUser } from "@/features/auth/queries";
import { ExerciseStatusBadges } from "@/features/exercises/components/exercise-badges";
import { ExerciseOwnerActions } from "@/features/exercises/components/exercise-owner-actions";
import { BODY_REGION_LABELS, CATEGORY_LABELS, EQUIPMENT_LABELS } from "@/features/exercises/constants";
import { getExercise, getExerciseUsage } from "@/features/exercises/queries";
import { formatDateKey, toDateKey } from "@/lib/dates";
import { formatKg } from "@/lib/format";
import { isUuid } from "@/lib/uuid";

export async function generateMetadata({ params }: PageProps<"/exercises/[id]">): Promise<Metadata> {
  const { id } = await params;
  const exercise = isUuid(id) ? await getExercise(id) : null;
  return { title: exercise?.name ?? "Exercise" };
}

export default async function ExerciseDetailPage({ params }: PageProps<"/exercises/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [user, exercise] = await Promise.all([requireUser(), getExercise(id)]);
  if (!exercise) notFound();
  const usage = await getExerciseUsage(exercise.id);
  const dateOf = (iso: string) =>
    formatDateKey(toDateKey(iso, user.timeZone), { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="grid gap-5 lg:gap-6">
      <BackLink href={routes.exercises}>Exercise library</BackLink>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">{exercise.name}</h1>
            <ExerciseStatusBadges exercise={exercise} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {BODY_REGION_LABELS[exercise.primaryMuscle.bodyRegion]} · {EQUIPMENT_LABELS[exercise.equipment]} ·{" "}
            {CATEGORY_LABELS[exercise.category]}
          </p>
        </div>
        {exercise.isCustom ? (
          <ExerciseOwnerActions exerciseId={exercise.id} name={exercise.name} isArchived={exercise.isArchived} />
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
        <Panel className="lg:col-span-7">
          <PanelHeader title="About" icon={Info} />
          {exercise.description ? (
            <p className="text-sm leading-relaxed text-foreground/90">{exercise.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No description.</p>
          )}

          <dl className="mt-5 grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Main muscle</dt>
              <dd className="mt-1.5">
                <span className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground">
                  {exercise.primaryMuscle.name}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Secondary muscles</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {exercise.secondaryMuscles.length ? (
                  exercise.secondaryMuscles.map((m) => (
                    <span key={m.id} className="inline-flex h-8 items-center rounded-full border border-border bg-accent px-3 text-sm text-accent-foreground">
                      {m.name}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Equipment</dt>
              <dd className="mt-1 font-medium">{EQUIPMENT_LABELS[exercise.equipment]}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Type</dt>
              <dd className="mt-1 font-medium">{CATEGORY_LABELS[exercise.category]}</dd>
            </div>
          </dl>
        </Panel>

        <Panel className="lg:col-span-5">
          <PanelHeader title="Your history" description="From completed workouts" icon={History} />
          {usage.sessionCount === 0 ? (
            <EmptyState icon={Dumbbell} title="Not logged yet">
              Once you log this exercise in a workout, your sessions and best sets appear here.
            </EmptyState>
          ) : (
            <dl className="grid grid-cols-2 gap-3">
              <Stat label="Sessions" value={String(usage.sessionCount)} />
              <Stat label="Last performed" value={usage.lastPerformedAt ? dateOf(usage.lastPerformedAt) : "—"} />
              <Stat
                label="Last top set"
                value={usage.lastTopSet ? `${formatKg(usage.lastTopSet.weightKg)} × ${usage.lastTopSet.reps}` : "—"}
              />
              <Stat
                label="Heaviest top set"
                value={usage.bestTopSet ? `${formatKg(usage.bestTopSet.weightKg)} × ${usage.bestTopSet.reps}` : "—"}
                detail={usage.bestTopSet ? dateOf(usage.bestTopSet.performedAt) : undefined}
              />
            </dl>
          )}
          {usage.sessionCount ? (
            <Link
              href={`${routes.progress}/exercises/${exercise.id}?range=all`}
              className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl border border-border text-sm font-medium text-primary transition-colors hover:bg-secondary"
            >
              View progression and records
            </Link>
          ) : null}
          {usage.planCount ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Used in {usage.planCount} planned {usage.planCount === 1 ? "slot" : "slots"} across your workout plans.
            </p>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 px-3.5 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd>
      {detail ? <dd className="text-xs text-muted-foreground">{detail}</dd> : null}
    </div>
  );
}

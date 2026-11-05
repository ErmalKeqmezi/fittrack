import { ArrowLeftRight, BarChart3, Check, ChevronDown, Clock, Dumbbell, Flame, Layers, ListChecks, Repeat, Sparkles, TrendingUp, Trophy, Weight } from "lucide-react";

import { EmptyState, Panel, PanelHeader } from "@/components/panel";
import { formatDateKey, toDateKey } from "@/lib/dates";
import { formatDuration, formatInteger, formatKg, formatSignedKg, formatVolume } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { BestSet, Highlight, MuscleBreakdown, RecordType, SessionComparison, SummaryExercise, SummaryRecord, WorkoutSummary } from "../../summary";

const RECORD_LABELS: Record<RecordType, string> = {
  max_weight: "Heaviest weight",
  max_reps: "Most reps in a set",
  best_e1rm: "Best est. 1RM",
};

const shortDate = (iso: string, timeZone: string) => formatDateKey(toDateKey(iso, timeZone), { day: "numeric", month: "short", year: "numeric" });

/** A bodyweight set has no weight to show. */
const setText = ({ weightKg, reps }: BestSet) => (weightKg > 0 ? `${formatKg(weightKg)} × ${reps}` : `${reps} reps`);

const signedPercent = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(value)}%`;

const signedCount = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : "±"}${formatInteger(Math.abs(value))}`;

function durationChangeText(minutes: number) {
  if (minutes === 0) return "Same duration";
  return `${formatDuration(Math.abs(minutes))} ${minutes < 0 ? "shorter" : "longer"}`;
}

/** Gains are accented, but a decrease stays neutral: a lighter session is not a failure. */
function Change({ label, value, change }: { label: string; value: string; change: number }) {
  return (
    <span className="inline-flex items-baseline gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium tabular-nums", change > 0 ? "text-primary" : "text-foreground/80")}>{value}</span>
    </span>
  );
}

export function SummaryStats({ stats }: { stats: WorkoutSummary["stats"] }) {
  const items = [
    { icon: Clock, label: "Duration", value: formatDuration(stats.durationMinutes) },
    { icon: Weight, label: "Total volume", value: formatVolume(stats.volumeKg) },
    { icon: Dumbbell, label: "Exercises", value: formatInteger(stats.exerciseCount) },
    { icon: Layers, label: "Completed sets", value: formatInteger(stats.setCount) },
    { icon: Repeat, label: "Total reps", value: formatInteger(stats.repCount) },
    { icon: Trophy, label: "New PRs", value: formatInteger(stats.recordCount) },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="rounded-2xl border border-border bg-card p-4">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className="size-3.5 shrink-0 text-primary" aria-hidden /> {label}
          </dt>
          <dd className="mt-1.5 text-xl font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ExerciseRow({ exercise, open, timeZone }: { exercise: SummaryExercise; open: boolean; timeZone: string }) {
  const { previous } = exercise;
  return (
    <details open={open} className="group rounded-xl border border-border bg-background/40">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-xl px-3 py-2.5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">{exercise.name}</span>
            {exercise.recordCount ? <Trophy className="size-3.5 shrink-0 text-primary" aria-label="New personal record" /> : null}
          </span>
          <span className="block truncate text-xs text-muted-foreground tabular-nums">
            {exercise.setCount} {exercise.setCount === 1 ? "set" : "sets"}
            {exercise.setCount ? ` · ${formatVolume(exercise.volumeKg)}` : ""}
            {exercise.best ? ` · best ${setText(exercise.best)}` : ""}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
      </summary>

      <div className="border-t border-border px-3 py-3">
        {exercise.sets.length ? (
          <ol className="grid gap-1.5">
            {exercise.sets.map((set) => (
              <li key={set.id} className="flex items-center gap-2.5 text-sm">
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-semibold tabular-nums",
                    set.isWarmup ? "bg-secondary text-muted-foreground" : "bg-accent text-primary",
                  )}
                >
                  {set.label}
                </span>
                <span className={cn("tabular-nums", set.isWarmup && "text-muted-foreground")}>{setText(set)}</span>
                {set.rpe !== null ? <span className="text-xs text-muted-foreground tabular-nums">RPE {set.rpe}</span> : null}
                {set.records.length ? (
                  <Trophy
                    className="size-3.5 shrink-0 text-primary"
                    aria-label={`Personal record: ${set.records.map((r) => RECORD_LABELS[r]).join(", ")}`}
                  >
                    <title>{`Personal record: ${set.records.map((r) => RECORD_LABELS[r]).join(", ")}`}</title>
                  </Trophy>
                ) : null}
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {set.previous ? `Last ${setText(set.previous)}` : set.isWarmup ? "Warm-up" : ""}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-muted-foreground">No sets completed for this exercise.</p>
        )}

        {exercise.notes ? <p className="mt-3 text-xs whitespace-pre-line text-muted-foreground">{exercise.notes}</p> : null}

        {exercise.bestE1rmKg !== null ? (
          <p className="mt-3 text-xs text-muted-foreground tabular-nums">Best est. 1RM {formatKg(exercise.bestE1rmKg)}</p>
        ) : null}

        <div className="mt-3 rounded-lg bg-secondary/50 px-3 py-2.5">
          {previous ? (
            <>
              <p className="text-xs text-muted-foreground tabular-nums">
                Previous session, {shortDate(previous.startedAt, timeZone)}: {previous.setCount} {previous.setCount === 1 ? "set" : "sets"} · {formatVolume(previous.volumeKg)}
                {previous.best ? ` · best ${setText(previous.best)}` : ""}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                <Change label="Volume" value={formatSignedKg(previous.volumeChangeKg)} change={previous.volumeChangeKg} />
                {previous.topWeightChangeKg !== null ? (
                  <Change label="Top weight" value={formatSignedKg(previous.topWeightChangeKg)} change={previous.topWeightChangeKg} />
                ) : null}
                {previous.e1rmChangeKg !== null ? (
                  <Change label="Est. 1RM" value={formatSignedKg(previous.e1rmChangeKg)} change={previous.e1rmChangeKg} />
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">First time logging this exercise, so there is nothing to compare yet.</p>
          )}
        </div>
      </div>
    </details>
  );
}

export function ExerciseBreakdown({ exercises, open, timeZone }: { exercises: SummaryExercise[]; open: boolean; timeZone: string }) {
  return (
    <Panel>
      <PanelHeader title="Exercises" icon={ListChecks} description={open ? undefined : "Tap an exercise to see its sets"} />
      {exercises.length ? (
        <div className="grid gap-2">
          {exercises.map((exercise) => (
            <ExerciseRow key={exercise.id} exercise={exercise} open={open} timeZone={timeZone} />
          ))}
        </div>
      ) : (
        <EmptyState icon={Dumbbell} title="No exercises in this workout" />
      )}
    </Panel>
  );
}

function recordValue(record: SummaryRecord, value: number) {
  return record.type === "max_reps" ? `${formatInteger(value)} reps` : formatKg(value);
}

export function PersonalRecords({ records, celebrate }: { records: SummaryRecord[]; celebrate: boolean }) {
  return (
    <Panel>
      <PanelHeader title="Personal records" icon={Trophy} />
      {records.length ? (
        <ul className="grid gap-2">
          {records.map((record, i) => (
            <li
              key={`${record.exerciseId}-${record.type}`}
              style={celebrate ? { animationDelay: `${i * 90}ms` } : undefined}
              className={cn(
                "rounded-xl border border-primary/25 bg-accent/40 px-3 py-2.5",
                celebrate && "animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500 motion-reduce:animate-none",
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-medium">{record.exerciseName}</p>
                <p className="shrink-0 text-sm font-semibold text-primary tabular-nums">{recordValue(record, record.value)}</p>
              </div>
              <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-muted-foreground tabular-nums">
                <p>{RECORD_LABELS[record.type]}</p>
                <p className="shrink-0">
                  was {recordValue(record, record.previousValue)} · +{recordValue(record, record.improvement)}
                </p>
              </div>
              {record.type === "best_e1rm" ? (
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">Estimated from {setText(record)}, not a lifted weight.</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No new personal records this session. Keep building!</p>
      )}
    </Panel>
  );
}

function withPercent(text: string, percent: number | null, change: number | null) {
  return percent !== null && change ? `${text} (${signedPercent(percent)})` : text;
}

export function PreviousComparison({ comparison, timeZone }: { comparison: SessionComparison | null; timeZone: string }) {
  if (!comparison) {
    return (
      <Panel>
        <PanelHeader title="Compared with last time" icon={ArrowLeftRight} />
        <p className="text-sm text-muted-foreground">This is your first recorded session for this workout. Future sessions will appear here for comparison.</p>
      </Panel>
    );
  }

  const others = [
    comparison.onlyThisSession.length ? `Only this session: ${comparison.onlyThisSession.join(", ")}.` : null,
    comparison.onlyPreviousSession.length ? `Only last time: ${comparison.onlyPreviousSession.join(", ")}.` : null,
  ].filter(Boolean);

  return (
    <Panel>
      <PanelHeader title="Compared with last time" icon={ArrowLeftRight} description={`${comparison.name} · ${shortDate(comparison.startedAt, timeZone)}`} />
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-secondary/50 p-3">
          <dt className="text-xs text-muted-foreground">Volume</dt>
          <dd className={cn("mt-1 text-sm font-semibold tabular-nums", comparison.volumeChangeKg > 0 && "text-primary")}>
            {withPercent(formatSignedKg(comparison.volumeChangeKg), comparison.volumeChangePercent, comparison.volumeChangeKg)}
          </dd>
        </div>
        <div className="rounded-xl bg-secondary/50 p-3">
          <dt className="text-xs text-muted-foreground">Duration</dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums">
            {comparison.durationChangeMinutes === null ? "—" : durationChangeText(comparison.durationChangeMinutes)}
          </dd>
        </div>
      </dl>

      {comparison.exercises.length ? (
        <ul className="mt-3 divide-y divide-border">
          {comparison.exercises.map((e) => (
            <li key={e.exerciseId} className="py-2.5 last:pb-0">
              <p className="truncate text-sm font-medium">{e.name}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {e.topWeightChangeKg !== null && (e.current?.weightKg || e.previous?.weightKg) ? (
                  <Change label="Weight" value={withPercent(formatSignedKg(e.topWeightChangeKg), e.topWeightChangePercent, e.topWeightChangeKg)} change={e.topWeightChangeKg} />
                ) : null}
                <Change label="Reps" value={signedCount(e.repsChange)} change={e.repsChange} />
                {e.e1rmChangeKg !== null ? (
                  <Change label="Est. 1RM" value={withPercent(formatSignedKg(e.e1rmChangeKg), e.e1rmChangePercent, e.e1rmChangeKg)} change={e.e1rmChangeKg} />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">No exercise was logged in both sessions.</p>
      )}

      {others.length ? <p className="mt-3 text-xs text-muted-foreground">{others.join(" ")}</p> : null}
    </Panel>
  );
}

export function MuscleWork({ muscles }: { muscles: MuscleBreakdown[] }) {
  // Bodyweight sessions have no volume, so their bars compare sets instead.
  const byVolume = muscles.some((m) => m.volumeKg > 0);
  const value = (m: MuscleBreakdown) => (byVolume ? m.volumeKg : m.sets);
  const max = Math.max(...muscles.map(value), 0);

  return (
    <Panel>
      <PanelHeader title="Muscle groups" icon={BarChart3} description={byVolume ? "Volume this session" : "Sets this session"} />
      {muscles.length ? (
        <>
          <ul className="grid gap-3">
            {muscles.map((m) => (
              <li key={m.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{m.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {byVolume ? formatVolume(m.volumeKg) : `${m.sets} ${m.sets === 1 ? "set" : "sets"}`}
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-secondary" aria-hidden>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${max ? (value(m) / max) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Based on how each exercise is classified: main muscles count fully, secondary muscles count as half. This shows logged work, not muscle activation or fatigue.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No completed sets to break down.</p>
      )}
    </Panel>
  );
}

const HIGHLIGHT_ICONS: Record<Highlight["kind"], React.ComponentType<{ className?: string }>> = {
  record: Trophy,
  volume: Flame,
  progress: TrendingUp,
};

/** Only says what the data supports, so it stays hidden when there is nothing to say. */
export function WorkoutHighlights({ highlights }: { highlights: Highlight[] }) {
  if (!highlights.length) return null;
  return (
    <Panel>
      <PanelHeader title="Workout Highlights" icon={Sparkles} />
      <ul className="grid gap-3">
        {highlights.map((highlight) => {
          const Icon = HIGHLIGHT_ICONS[highlight.kind];
          return (
            <li key={highlight.id} className="flex gap-3">
              <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{highlight.title}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{highlight.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/** The header shown right after finishing. */
export function CompletionHeader({ name, when, message }: { name: string; when: string; message: string }) {
  return (
    <header className="flex flex-col items-center gap-3 py-2 text-center lg:py-4">
      <span className="grid size-16 animate-in place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 duration-500 zoom-in-50 motion-reduce:animate-none">
        <Check className="size-8" strokeWidth={3} aria-hidden />
      </span>
      <div className="min-w-0 max-w-full">
        <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">Workout Complete!</h1>
        <p className="mt-1 text-base font-medium break-words">{name}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{when}</p>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </header>
  );
}

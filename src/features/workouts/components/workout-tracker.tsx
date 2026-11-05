"use client";

import { Flag, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useReducer, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmAction } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { routes } from "@/config/routes";
import { ExercisePickerDialog } from "@/features/exercises/components/exercise-picker-dialog";
import type { Exercise } from "@/features/exercises/types";
import { formatVolume } from "@/lib/format";

import { discardWorkout, finishWorkout, loadPreviousPerformance, saveWorkoutEdits, type NewRecord } from "../actions";
import { pickInitialState } from "../drafts";
import {
  exerciseProgress,
  initialSetCount,
  MAX_SESSION_EXERCISES,
  toSnapshot,
  trackerReducer,
  unfinishedSetCount,
} from "../tracker-state";
import type { PreviousPerformance, TrackerState } from "../types";
import { useTrackerSync } from "../use-tracker-sync";
import { ElapsedTime } from "./elapsed-time";
import { ExerciseCard } from "./exercise-card";
import { RestTimer } from "./rest-timer";
import { SyncIndicator } from "./sync-indicator";

type Props = {
  initial: TrackerState;
  serverUpdatedAt: string;
  previous: Record<string, PreviousPerformance>;
  library: Exercise[];
  timeZone: string;
  planName: string | null;
};

function describeRecord(r: NewRecord) {
  const was = Math.round(r.previousValue * 100) / 100;
  if (r.recordType === "max_weight") return `Heaviest: ${r.weightKg} kg × ${r.reps} (was ${was} kg)`;
  if (r.recordType === "max_reps") return `Most reps: ${r.reps} @ ${r.weightKg} kg (was ${was})`;
  return `Best est. 1RM: ${r.value} kg from ${r.weightKg} kg × ${r.reps} (was ${was} kg)`;
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function WorkoutTracker({ initial, serverUpdatedAt, previous: initialPrevious, library, timeZone, planName }: Props) {
  const router = useRouter();
  const [state, dispatch] = useReducer(trackerReducer, undefined, () => pickInitialState(initial, serverUpdatedAt).state);
  const [previous, setPrevious] = useState(initialPrevious);
  const [finishOpen, setFinishOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const finishing = useRef(false);
  const live = state.status === "in_progress";
  const sync = useTrackerSync(state, { enabled: live });

  const totals = state.exercises.reduce(
    (acc, e) => {
      const p = exerciseProgress(e);
      return { sets: acc.sets + p.doneSets, volume: acc.volume + p.volumeKg };
    },
    { sets: 0, volume: 0 },
  );
  const unfinished = unfinishedSetCount(state);
  const durationMinutes = state.endedAt ? Math.round((Date.parse(state.endedAt) - Date.parse(state.startedAt)) / 60000) : null;

  const addExercises = useCallback(
    async (ids: string[]) => {
      const chosen = ids.map((id) => library.find((e) => e.id === id)).filter((e): e is Exercise => Boolean(e));
      dispatch({
        type: "addExercises",
        exercises: chosen.map((e) => ({
          id: crypto.randomUUID(),
          exerciseId: e.id,
          name: e.name,
          setIds: Array.from({ length: initialSetCount(null) }, () => crypto.randomUUID()),
        })),
      });
      const missing = chosen.map((e) => e.id).filter((id) => !previous[id]);
      if (missing.length) {
        try {
          const loaded = await loadPreviousPerformance(missing, state.startedAt, state.sessionId);
          setPrevious((p) => ({ ...p, ...loaded }));
        } catch {
          // Offline: hints appear once the page reloads online.
        }
      }
      return true;
    },
    [library, previous, state.startedAt, state.sessionId],
  );

  function finish() {
    // A second tap can't start a second finish.
    if (finishing.current) return;
    finishing.current = true;
    startTransition(async () => {
      await sync.pause();
      const result = await finishWorkout(toSnapshot(state)).catch(() => ({ ok: false as const, message: "No connection. Your workout is saved on this device; try again when online." }));
      if (!result.ok) {
        finishing.current = false;
        sync.resume();
        toast.error(result.message);
        return;
      }
      sync.discardDraft();
      toast.success("Workout finished. Nice work!");
      for (const record of result.records) {
        toast(`New PR · ${record.exerciseName}`, { description: describeRecord(record), duration: 8000, icon: "🏆" });
      }
      router.replace(`${routes.workouts}/${state.sessionId}?completed=1`);
      router.refresh();
    });
  }

  function saveEdits() {
    startTransition(async () => {
      const result = await saveWorkoutEdits(toSnapshot(state)).catch(() => ({ ok: false as const, message: "No connection. Try again when online." }));
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      sync.discardDraft();
      toast.success(result.message ?? "Changes saved.");
      router.replace(`${routes.workouts}/${state.sessionId}`);
      router.refresh();
    });
  }

  function cancelEdits() {
    sync.discardDraft();
    router.replace(`${routes.workouts}/${state.sessionId}`);
  }

  function discard() {
    startTransition(async () => {
      await sync.pause();
      sync.discardDraft();
      const result = await discardWorkout(state.sessionId).catch(() => ({ ok: false as const, message: "No connection. Try again when online." }));
      if (!result.ok) {
        sync.resume();
        toast.error(result.message);
      }
    });
  }

  const stopRest = useCallback(() => dispatch({ type: "stopRest" }), []);
  const adjustRest = useCallback((seconds: number) => dispatch({ type: "adjustRest", seconds, now: Date.now() }), []);

  return (
    <div className="grid gap-4 pb-28 lg:pb-8">
      {/* Session bar */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 -mx-4 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-lg sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <input
              aria-label="Workout name"
              value={state.name}
              maxLength={80}
              onChange={(e) => dispatch({ type: "rename", name: e.target.value })}
              className="w-full truncate rounded-md bg-transparent text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring/50 lg:text-2xl"
            />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {live ? <ElapsedTime since={state.startedAt} className="font-semibold text-foreground tabular-nums" /> : <span>Editing logged workout</span>}
              <span className="tabular-nums">
                {totals.sets} {totals.sets === 1 ? "set" : "sets"} · {formatVolume(Math.round(totals.volume))}
              </span>
              {planName ? <span className="hidden sm:inline">{planName}</span> : null}
              {live ? <SyncIndicator status={sync.status} message={sync.message} /> : null}
            </div>
          </div>
          {live ? (
            <Button className="h-11 rounded-xl px-4" onClick={() => setFinishOpen(true)} disabled={busy}>
              <Flag aria-hidden /> Finish
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" className="h-11 rounded-xl px-3" onClick={cancelEdits} disabled={busy}>
                Cancel
              </Button>
              <Button className="h-11 rounded-xl px-4" onClick={saveEdits} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Save
              </Button>
            </div>
          )}
        </div>
      </div>

      {!live ? (
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">
            Started
            <input
              type="datetime-local"
              value={toLocalInput(state.startedAt)}
              onChange={(e) => {
                if (!e.target.value) return;
                const startedAt = new Date(e.target.value).toISOString();
                const keep = durationMinutes ?? 60;
                dispatch({ type: "setTimes", startedAt, endedAt: new Date(Date.parse(startedAt) + keep * 60000).toISOString() });
              }}
              className="h-11 rounded-xl border border-input bg-input/30 px-3 text-base outline-none focus-visible:border-ring md:text-sm"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Duration (minutes)
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={1440}
              value={durationMinutes ?? ""}
              onChange={(e) => {
                const minutes = Math.min(1440, Math.max(0, Number(e.target.value) || 0));
                dispatch({ type: "setTimes", startedAt: state.startedAt, endedAt: new Date(Date.parse(state.startedAt) + minutes * 60000).toISOString() });
              }}
              className="h-11 rounded-xl border border-input bg-input/30 px-3 text-base outline-none focus-visible:border-ring md:text-sm"
            />
          </label>
        </div>
      ) : null}

      {state.exercises.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm font-medium">No exercises yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Add the first exercise to start logging sets.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
          {state.exercises.map((exercise, i) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              index={i}
              count={state.exercises.length}
              previous={previous[exercise.exerciseId]}
              live={live}
              timeZone={timeZone}
              dispatch={dispatch}
            />
          ))}
        </div>
      )}

      <ExercisePickerDialog
        title="Add exercises"
        exercises={library}
        existingIds={new Set(state.exercises.map((e) => e.exerciseId))}
        existingLabel="In workout"
        maxSelectable={MAX_SESSION_EXERCISES - state.exercises.length}
        onConfirm={addExercises}
        trigger={
          <Button variant="outline" className="h-12 rounded-xl border-dashed text-primary" disabled={state.exercises.length >= MAX_SESSION_EXERCISES}>
            <Plus aria-hidden /> Add exercise
          </Button>
        }
      />

      <label className="grid gap-2 text-sm font-medium">
        Workout notes
        <textarea
          value={state.notes}
          maxLength={2000}
          rows={3}
          placeholder="Energy, sleep, anything worth remembering…"
          onChange={(e) => dispatch({ type: "setNotes", notes: e.target.value })}
          className="rounded-xl border border-input bg-input/30 px-3.5 py-3 text-base font-normal outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        />
      </label>

      {live ? (
        <ConfirmAction
          title="Discard this workout?"
          description="Everything logged in this session is deleted. This cannot be undone."
          confirmLabel="Discard workout"
          onConfirm={discard}
          trigger={
            <Button variant="ghost" className="h-11 justify-self-start rounded-xl text-destructive hover:text-destructive" disabled={busy}>
              <Trash2 aria-hidden /> Discard workout
            </Button>
          }
        />
      ) : null}

      {live ? <RestTimer timer={state.restTimer} onAdjust={adjustRest} onStop={stopRest} /> : null}

      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finish workout?</DialogTitle>
            <DialogDescription>Your completed sets are saved to your history.</DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-secondary/60 p-3">
              <dt className="text-xs text-muted-foreground">Duration</dt>
              <dd className="mt-1 text-sm font-semibold">
                <ElapsedTime since={state.startedAt} />
              </dd>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <dt className="text-xs text-muted-foreground">Sets</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums">{totals.sets}</dd>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <dt className="text-xs text-muted-foreground">Volume</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums">{formatVolume(Math.round(totals.volume))}</dd>
            </div>
          </dl>
          {unfinished ? (
            <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-3 text-sm text-amber-200">
              {unfinished} {unfinished === 1 ? "set is" : "sets are"} not marked as done and will not be saved.
            </p>
          ) : null}
          {totals.sets === 0 ? (
            <p className="text-sm text-muted-foreground">Mark at least one set as done to finish, or discard the workout.</p>
          ) : null}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="h-11 rounded-xl" onClick={() => setFinishOpen(false)}>
              Keep training
            </Button>
            <Button className="h-11 rounded-xl px-5" onClick={finish} disabled={busy || totals.sets === 0}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Flag aria-hidden />} Finish workout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

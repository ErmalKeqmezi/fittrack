import type { TrackerState } from "./types";

/**
 * On-device drafts. Every change is written here first, so an interrupted
 * connection or a closed tab never loses sets, including rows not yet
 * filled in (which the server never receives).
 */

const PREFIX = "fittrack:workout-draft:";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;

type Draft = { savedAt: number; state: TrackerState };

export function readDraft(sessionId: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + sessionId);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    if (!draft?.state || draft.state.sessionId !== sessionId) return null;
    if (Date.now() - draft.savedAt > MAX_AGE_MS) {
      clearDraft(sessionId);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function writeDraft(state: TrackerState) {
  try {
    window.localStorage.setItem(PREFIX + state.sessionId, JSON.stringify({ savedAt: Date.now(), state } satisfies Draft));
  } catch {
    // Storage full or unavailable (private mode): the server copy still applies.
  }
}

export function clearDraft(sessionId: string) {
  try {
    window.localStorage.removeItem(PREFIX + sessionId);
  } catch {
    // ignore
  }
}

/**
 * Targets come from the plan, matched by exercise. An exercise swapped in for
 * this workout only isn't in the plan, so the server copy has no targets for
 * it; this device's draft still knows them, along with its unfilled rows.
 */
export function restoreSwapTargets(server: TrackerState, draft: TrackerState): TrackerState {
  const drafted = new Map(draft.exercises.map((e) => [e.id, e]));
  return {
    ...server,
    exercises: server.exercises.map((exercise) => {
      const known = drafted.get(exercise.id);
      if (exercise.targets || !known?.targets || known.exerciseId !== exercise.exerciseId) return exercise;
      const saved = new Set(exercise.sets.map((s) => s.id));
      const unfilled = known.sets.filter((s) => !s.done && !saved.has(s.id));
      return { ...exercise, targets: known.targets, restSeconds: known.restSeconds, sets: [...exercise.sets, ...unfilled] };
    }),
  };
}

/** Use the draft only if it is newer than the last server save. */
export function pickInitialState(server: TrackerState, serverUpdatedAt: string): { state: TrackerState; fromDraft: boolean } {
  const draft = readDraft(server.sessionId);
  if (draft && draft.state.status === server.status) {
    if (draft.savedAt > Date.parse(serverUpdatedAt)) return { state: draft.state, fromDraft: true };
    return { state: restoreSwapTargets(server, draft.state), fromDraft: false };
  }
  return { state: server, fromDraft: false };
}

export type SessionStatus = "in_progress" | "completed";

/** One previously logged set, used for "last time" hints and comparisons. */
export type PreviousSet = {
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe: number | null;
  isWarmup: boolean;
};

export type PreviousPerformance = {
  sessionId: string;
  startedAt: string;
  sets: PreviousSet[];
};

/** Tracker set: inputs are strings while typing; only valid rows are saved. */
export type TrackerSet = {
  id: string;
  weight: string;
  reps: string;
  rpe: string;
  isWarmup: boolean;
  done: boolean;
};

export type TrackerExercise = {
  id: string; // session_exercises.id (client-generated for new rows)
  exerciseId: string;
  name: string;
  notes: string;
  showNotes: boolean;
  showRpe: boolean;
  restSeconds: number;
  targets: { sets: number; repsMin: number; repsMax: number } | null;
  sets: TrackerSet[];
};

export type RestTimer = { endsAt: number; totalSeconds: number; label: string };

export type TrackerState = {
  sessionId: string;
  status: SessionStatus;
  name: string;
  notes: string;
  startedAt: string;
  endedAt: string | null;
  exercises: TrackerExercise[];
  restTimer: RestTimer | null;
};

/** What the server stores: only rows with valid numbers. */
export type SessionSnapshot = {
  sessionId: string;
  name: string;
  notes: string;
  startedAt?: string;
  endedAt?: string;
  exercises: {
    id: string;
    exercise_id: string;
    notes: string;
    sets: {
      id: string;
      weight_kg: number;
      reps: number;
      rpe: number | null;
      is_warmup: boolean;
      is_completed: boolean;
    }[];
  }[];
};

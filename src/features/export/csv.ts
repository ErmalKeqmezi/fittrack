import { toDateKey } from "@/lib/dates";

/** Pure helpers that turn logged workouts into a spreadsheet. */

export type ExportSession = { id: string; name: string; status: string; started_at: string; ended_at: string | null; notes: string | null };
export type ExportSessionExercise = { id: string; session_id: string; exercise_name: string; position: number; notes: string | null };
export type ExportSet = {
  session_exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  rpe: number | null;
  is_warmup: boolean;
  is_completed: boolean;
  notes: string | null;
};

type Cell = string | number | null;

/**
 * Quotes a CSV cell. Text starting with = + - @ would run as a formula when
 * opened in a spreadsheet, so it is prefixed with an apostrophe.
 */
export function csvCell(value: Cell) {
  if (value === null) return "";
  if (typeof value === "number") return String(value);
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toCsv(headers: string[], rows: Cell[][]) {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));
  // The byte order mark tells Excel the file is UTF-8.
  return `﻿${lines.join("\r\n")}\r\n`;
}

export const SET_HEADERS = [
  "date",
  "started_at",
  "workout",
  "duration_minutes",
  "exercise",
  "set",
  "type",
  "weight_kg",
  "reps",
  "rpe",
  "volume_kg",
  "set_notes",
  "exercise_notes",
  "workout_notes",
];

/** One row per completed set of completed workouts, oldest first. */
export function buildSetRows(sessions: ExportSession[], exercises: ExportSessionExercise[], sets: ExportSet[], timeZone: string): Cell[][] {
  const setsByExercise = new Map<string, ExportSet[]>();
  for (const set of sets) {
    if (set.is_completed) setsByExercise.set(set.session_exercise_id, [...(setsByExercise.get(set.session_exercise_id) ?? []), set]);
  }
  const exercisesBySession = new Map<string, ExportSessionExercise[]>();
  for (const e of exercises) exercisesBySession.set(e.session_id, [...(exercisesBySession.get(e.session_id) ?? []), e]);

  const rows: Cell[][] = [];
  const completed = sessions.filter((s) => s.status === "completed").sort((a, b) => a.started_at.localeCompare(b.started_at));
  for (const session of completed) {
    const duration = session.ended_at ? Math.round((Date.parse(session.ended_at) - Date.parse(session.started_at)) / 60000) : null;
    const ordered = [...(exercisesBySession.get(session.id) ?? [])].sort((a, b) => a.position - b.position);
    for (const exercise of ordered) {
      const orderedSets = [...(setsByExercise.get(exercise.id) ?? [])].sort((a, b) => a.set_number - b.set_number);
      for (const set of orderedSets) {
        const weight = Number(set.weight_kg);
        rows.push([
          toDateKey(session.started_at, timeZone),
          session.started_at,
          session.name,
          duration,
          exercise.exercise_name,
          set.set_number,
          set.is_warmup ? "warm-up" : "working",
          weight,
          set.reps,
          set.rpe === null ? null : Number(set.rpe),
          // Warm-ups are excluded from volume, matching the rest of the app.
          set.is_warmup ? 0 : Math.round(weight * set.reps * 100) / 100,
          set.notes,
          exercise.notes,
          session.notes,
        ]);
      }
    }
  }
  return rows;
}

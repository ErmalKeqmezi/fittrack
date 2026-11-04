import { describe, expect, it } from "vitest";

import { buildSetRows, csvCell, SET_HEADERS, toCsv, type ExportSession, type ExportSessionExercise, type ExportSet } from "./csv";

describe("csvCell", () => {
  it("quotes separators, quotes and line breaks", () => {
    expect(csvCell('felt "strong", no pain')).toBe('"felt ""strong"", no pain"');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
    expect(csvCell(72.5)).toBe("72.5");
    expect(csvCell(null)).toBe("");
  });

  it("neutralises spreadsheet formulas in text", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@x")).toBe("'@x");
    expect(csvCell("=A1,B1")).toBe(`"'=A1,B1"`);
  });
});

describe("toCsv", () => {
  it("adds a UTF-8 marker and uses CRLF", () => {
    expect(toCsv(["a", "b"], [[1, "x"]])).toBe("﻿a,b\r\n1,x\r\n");
  });
});

describe("buildSetRows", () => {
  const sessions: ExportSession[] = [
    { id: "new", name: "Pull", status: "completed", started_at: "2026-11-02T10:00:00Z", ended_at: "2026-11-02T11:00:00Z", notes: null },
    { id: "live", name: "Open", status: "in_progress", started_at: "2026-11-03T10:00:00Z", ended_at: null, notes: null },
    { id: "old", name: "Push", status: "completed", started_at: "2026-11-01T23:30:00Z", ended_at: null, notes: "Good" },
  ];
  const exercises: ExportSessionExercise[] = [
    { id: "e2", session_id: "old", exercise_name: "Fly", position: 1, notes: null },
    { id: "e1", session_id: "old", exercise_name: "Bench", position: 0, notes: "Grip" },
    { id: "e3", session_id: "new", exercise_name: "Row", position: 0, notes: null },
    { id: "e4", session_id: "live", exercise_name: "Curl", position: 0, notes: null },
  ];
  const set = (session_exercise_id: string, set_number: number, weight_kg: number, reps: number, extra: Partial<ExportSet> = {}): ExportSet => ({
    session_exercise_id,
    set_number,
    weight_kg,
    reps,
    rpe: null,
    is_warmup: false,
    is_completed: true,
    notes: null,
    ...extra,
  });
  const rows = buildSetRows(
    sessions,
    exercises,
    [
      set("e1", 2, 70, 10, { rpe: 8.5 }),
      set("e1", 1, 40, 10, { is_warmup: true }),
      set("e2", 1, 15, 12),
      set("e3", 1, 60, 8),
      set("e3", 2, 60, 8, { is_completed: false }),
      set("e4", 1, 20, 10),
    ],
    "Europe/Tirane",
  );

  it("orders by workout, exercise and set, and skips unfinished work", () => {
    expect(rows.map((r) => [r[4], r[5]])).toEqual([
      ["Bench", 1],
      ["Bench", 2],
      ["Fly", 1],
      ["Row", 1],
    ]);
  });

  it("uses the local date and excludes warm-ups from volume", () => {
    expect(rows[0][0]).toBe("2026-11-02");
    expect(rows[0][6]).toBe("warm-up");
    expect(rows[0][10]).toBe(0);
    expect(rows[1][10]).toBe(700);
    expect(rows[1][9]).toBe(8.5);
    expect(rows[3][3]).toBe(60);
  });

  it("has one value per header", () => {
    for (const row of rows) expect(row).toHaveLength(SET_HEADERS.length);
  });
});

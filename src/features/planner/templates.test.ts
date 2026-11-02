import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PLAN_TEMPLATES, TEMPLATE_KEYS, templateExerciseNames, templateToPlanDays } from "./templates";

// Built-in exercise names as seeded by the SQL migrations.
const migrationsDir = join(process.cwd(), "supabase/migrations");
const seededNames = new Set(
  readdirSync(migrationsDir)
    .map((f) => readFileSync(join(migrationsDir, f), "utf8"))
    .flatMap((sql) => [...sql.matchAll(/^\s*\('((?:[^']|'')+)',\s*'/gm)].map((m) => m[1].replaceAll("''", "'"))),
);

describe("plan templates", () => {
  it("covers every template key accepted by the database", () => {
    expect(PLAN_TEMPLATES.map((t) => t.key).sort()).toEqual([...TEMPLATE_KEYS].sort());
    const schema = readFileSync(join(migrationsDir, "20261102000001_core_schema.sql"), "utf8");
    for (const key of TEMPLATE_KEYS) expect(schema).toContain(`'${key}'`);
  });

  it.each(PLAN_TEMPLATES.map((t) => [t.name, t] as const))("%s only uses built-in exercises", (_, template) => {
    expect(seededNames.size).toBeGreaterThan(60);
    const missing = templateExerciseNames(template).filter((name) => !seededNames.has(name));
    expect(missing).toEqual([]);
  });

  it.each(PLAN_TEMPLATES.map((t) => [t.name, t] as const))("%s respects database limits", (_, template) => {
    expect(template.days.length).toBeLessThanOrEqual(14);
    const weekdays = template.days.map((d) => d.weekday).filter((w) => w !== null);
    expect(new Set(weekdays).size).toBe(weekdays.length);
    expect(template.days.filter((d) => !d.isRestDay).length).toBe(template.daysPerWeek);
    for (const day of template.days) {
      if (day.isRestDay) expect(day.exercises).toHaveLength(0);
      expect(day.exercises.length).toBeLessThanOrEqual(20);
      for (const [, sets, min, max, rest] of day.exercises) {
        expect(sets).toBeGreaterThanOrEqual(1);
        expect(sets).toBeLessThanOrEqual(20);
        expect(min).toBeLessThanOrEqual(max);
        expect(rest).toBeLessThanOrEqual(900);
      }
    }
  });

  it("builds the plan payload and fails loudly on unknown exercises", () => {
    const template = PLAN_TEMPLATES[0];
    const ids = new Map(templateExerciseNames(template).map((n, i) => [n, `id-${i}`]));
    const days = templateToPlanDays(template, ids);
    expect(days[0]).toMatchObject({ name: "Push", weekday: 1, is_rest_day: false });
    expect(days[0].exercises[0]).toEqual({
      exercise_id: ids.get("Barbell Bench Press"),
      target_sets: 4,
      target_reps_min: 6,
      target_reps_max: 8,
      rest_seconds: 180,
    });
    expect(() => templateToPlanDays(template, new Map())).toThrow(/not found/);
  });
});

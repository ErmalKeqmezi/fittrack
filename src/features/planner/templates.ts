import type { Weekday } from "./constants";

/**
 * Optional starting points. Applying a template copies it into a normal,
 * fully editable plan; nothing stays linked to the template.
 * Exercise names must match built-in exercises (checked by templates.test.ts).
 */

export const TEMPLATE_KEYS = ["push_pull_legs", "upper_lower", "arnold_split", "full_body"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

/** [exercise name, sets, min reps, max reps, rest seconds] */
type TemplateExercise = readonly [name: string, sets: number, repsMin: number, repsMax: number, restSeconds: number];

export type TemplateDay = {
  name: string;
  weekday: Weekday | null;
  isRestDay?: boolean;
  exercises: readonly TemplateExercise[];
};

export type PlanTemplate = {
  key: TemplateKey;
  name: string;
  summary: string;
  daysPerWeek: number;
  level: string;
  days: readonly TemplateDay[];
};

const PUSH: TemplateDay["exercises"] = [
  ["Barbell Bench Press", 4, 6, 8, 180],
  ["Incline Dumbbell Press", 3, 8, 10, 120],
  ["Seated Dumbbell Shoulder Press", 3, 8, 10, 120],
  ["Dumbbell Lateral Raise", 3, 12, 15, 60],
  ["Triceps Pushdown", 3, 10, 12, 60],
  ["Overhead Cable Triceps Extension", 2, 10, 12, 60],
];

const PULL: TemplateDay["exercises"] = [
  ["Pull-Up", 4, 6, 10, 150],
  ["Barbell Row", 4, 6, 8, 150],
  ["Seated Cable Row", 3, 8, 12, 90],
  ["Face Pull", 3, 12, 15, 60],
  ["Barbell Curl", 3, 8, 12, 60],
  ["Hammer Curl", 2, 10, 12, 60],
];

const LEGS: TemplateDay["exercises"] = [
  ["Back Squat", 4, 5, 8, 180],
  ["Romanian Deadlift", 3, 8, 10, 150],
  ["Leg Press", 3, 10, 12, 120],
  ["Lying Leg Curl", 3, 10, 12, 60],
  ["Standing Calf Raise", 4, 10, 15, 60],
];

const CHEST_BACK: TemplateDay["exercises"] = [
  ["Barbell Bench Press", 4, 6, 10, 150],
  ["Incline Dumbbell Press", 3, 8, 10, 120],
  ["Dumbbell Fly", 3, 10, 12, 60],
  ["Pull-Up", 4, 6, 10, 120],
  ["Barbell Row", 4, 8, 10, 120],
  ["Close-Grip Lat Pulldown", 3, 10, 12, 90],
];

const SHOULDERS_ARMS: TemplateDay["exercises"] = [
  ["Overhead Press", 4, 6, 10, 150],
  ["Arnold Press", 3, 8, 10, 90],
  ["Dumbbell Lateral Raise", 3, 12, 15, 60],
  ["Barbell Curl", 3, 8, 12, 60],
  ["Incline Dumbbell Curl", 3, 10, 12, 60],
  ["Close-Grip Bench Press", 3, 8, 10, 90],
  ["Skull Crusher", 3, 10, 12, 60],
];

const ARNOLD_LEGS: TemplateDay["exercises"] = [
  ["Back Squat", 4, 6, 10, 180],
  ["Leg Press", 3, 10, 12, 120],
  ["Romanian Deadlift", 3, 8, 10, 120],
  ["Leg Extension", 3, 12, 15, 60],
  ["Lying Leg Curl", 3, 10, 12, 60],
  ["Standing Calf Raise", 4, 12, 15, 60],
];

export const PLAN_TEMPLATES: readonly PlanTemplate[] = [
  {
    key: "push_pull_legs",
    name: "Push / Pull / Legs",
    summary: "Pressing, pulling and leg days, each trained twice a week.",
    daysPerWeek: 6,
    level: "Intermediate",
    days: [
      { name: "Push", weekday: 1, exercises: PUSH },
      { name: "Pull", weekday: 2, exercises: PULL },
      { name: "Legs", weekday: 3, exercises: LEGS },
      { name: "Push", weekday: 4, exercises: PUSH },
      { name: "Pull", weekday: 5, exercises: PULL },
      { name: "Legs", weekday: 6, exercises: LEGS },
      { name: "Rest", weekday: 7, isRestDay: true, exercises: [] },
    ],
  },
  {
    key: "upper_lower",
    name: "Upper / Lower",
    summary: "Four sessions alternating upper and lower body.",
    daysPerWeek: 4,
    level: "Beginner to intermediate",
    days: [
      {
        name: "Upper A",
        weekday: 1,
        exercises: [
          ["Barbell Bench Press", 4, 5, 8, 180],
          ["Barbell Row", 4, 6, 8, 150],
          ["Overhead Press", 3, 8, 10, 120],
          ["Lat Pulldown", 3, 8, 12, 90],
          ["Barbell Curl", 2, 10, 12, 60],
          ["Triceps Pushdown", 2, 10, 12, 60],
        ],
      },
      {
        name: "Lower A",
        weekday: 2,
        exercises: [
          ["Back Squat", 4, 5, 8, 180],
          ["Romanian Deadlift", 3, 8, 10, 150],
          ["Walking Lunge", 3, 10, 12, 90],
          ["Standing Calf Raise", 4, 10, 15, 60],
          ["Hanging Leg Raise", 3, 10, 15, 60],
        ],
      },
      { name: "Rest", weekday: 3, isRestDay: true, exercises: [] },
      {
        name: "Upper B",
        weekday: 4,
        exercises: [
          ["Incline Dumbbell Press", 4, 8, 10, 120],
          ["Pull-Up", 4, 6, 10, 120],
          ["Seated Dumbbell Shoulder Press", 3, 8, 10, 90],
          ["Seated Cable Row", 3, 10, 12, 90],
          ["Hammer Curl", 2, 10, 12, 60],
          ["Overhead Cable Triceps Extension", 2, 10, 12, 60],
        ],
      },
      {
        name: "Lower B",
        weekday: 5,
        exercises: [
          ["Conventional Deadlift", 3, 3, 5, 240],
          ["Front Squat", 3, 6, 8, 180],
          ["Leg Press", 3, 10, 12, 120],
          ["Lying Leg Curl", 3, 10, 12, 60],
          ["Seated Calf Raise", 3, 12, 15, 60],
        ],
      },
    ],
  },
  {
    key: "arnold_split",
    name: "Arnold Split",
    summary: "Chest & back, shoulders & arms, legs, each twice a week. High volume.",
    daysPerWeek: 6,
    level: "Advanced",
    days: [
      { name: "Chest & Back", weekday: 1, exercises: CHEST_BACK },
      { name: "Shoulders & Arms", weekday: 2, exercises: SHOULDERS_ARMS },
      { name: "Legs", weekday: 3, exercises: ARNOLD_LEGS },
      { name: "Chest & Back", weekday: 4, exercises: CHEST_BACK },
      { name: "Shoulders & Arms", weekday: 5, exercises: SHOULDERS_ARMS },
      { name: "Legs", weekday: 6, exercises: ARNOLD_LEGS },
      { name: "Rest", weekday: 7, isRestDay: true, exercises: [] },
    ],
  },
  {
    key: "full_body",
    name: "Full Body",
    summary: "Three whole-body sessions with a rest day between each.",
    daysPerWeek: 3,
    level: "Beginner",
    days: [
      {
        name: "Full Body A",
        weekday: 1,
        exercises: [
          ["Back Squat", 3, 5, 8, 180],
          ["Barbell Bench Press", 3, 5, 8, 150],
          ["Barbell Row", 3, 6, 10, 120],
          ["Dumbbell Lateral Raise", 2, 12, 15, 60],
          ["Cable Crunch", 2, 10, 15, 60],
        ],
      },
      {
        name: "Full Body B",
        weekday: 3,
        exercises: [
          ["Romanian Deadlift", 3, 6, 10, 150],
          ["Overhead Press", 3, 6, 10, 120],
          ["Pull-Up", 3, 6, 10, 120],
          ["Walking Lunge", 2, 10, 12, 90],
          ["Hammer Curl", 2, 10, 12, 60],
        ],
      },
      {
        name: "Full Body C",
        weekday: 5,
        exercises: [
          ["Leg Press", 3, 8, 12, 120],
          ["Incline Dumbbell Press", 3, 8, 10, 120],
          ["Seated Cable Row", 3, 8, 12, 90],
          ["Face Pull", 2, 12, 15, 60],
          ["Triceps Pushdown", 2, 10, 12, 60],
        ],
      },
    ],
  },
];

export function getTemplate(key: string) {
  return PLAN_TEMPLATES.find((t) => t.key === key) ?? null;
}

export function templateExerciseNames(template: PlanTemplate) {
  return [...new Set(template.days.flatMap((d) => d.exercises.map(([name]) => name)))];
}

/** Builds the create_workout_plan payload, given a name → exercise id lookup. */
export function templateToPlanDays(template: PlanTemplate, exerciseIds: Map<string, string>) {
  return template.days.map((day) => ({
    name: day.name,
    weekday: day.weekday,
    is_rest_day: day.isRestDay ?? false,
    exercises: day.exercises.map(([name, sets, repsMin, repsMax, restSeconds]) => {
      const id = exerciseIds.get(name);
      if (!id) throw new Error(`Template exercise not found: ${name}`);
      return { exercise_id: id, target_sets: sets, target_reps_min: repsMin, target_reps_max: repsMax, rest_seconds: restSeconds };
    }),
  }));
}

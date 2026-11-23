import { addDays, isoWeekday, type DateKey } from "@/lib/dates";

/** One day square. `null` cells pad the first week so columns line up Monday to Sunday. */
export type DayCell = { date: DateKey; day: number; trained: boolean; isToday: boolean; isFuture: boolean } | null;

export type MonthActivity = {
  year: number;
  /** 1–12. */
  month: number;
  /** Days with at least one finished workout. */
  trainedDays: number;
  cells: DayCell[];
};

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11" for November 2026. */
export const monthKey = (year: number, month: number) => `${year}-${pad(month)}`;

/** Reads "2026-11" style values; anything else is null. */
export function parseMonthKey(value: unknown): { year: number; month: number } | null {
  const match = typeof value === "string" ? /^(\d{4})-(\d{2})$/.exec(value) : null;
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? { year, month } : null;
}

/** The month before or after, across year ends. */
export function shiftMonth({ year, month }: { year: number; month: number }, by: number) {
  const index = year * 12 + (month - 1) + by;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/**
 * A calendar of one month, Monday first, marking the days you trained. Days are
 * counted, not workouts: two sessions on one day light one square.
 */
export function monthActivity(year: number, month: number, trained: ReadonlySet<DateKey>, today: DateKey): MonthActivity {
  const first = `${monthKey(year, month)}-01`;
  const cells: DayCell[] = Array.from({ length: isoWeekday(first) - 1 }, () => null);
  let trainedDays = 0;
  for (let date = first; date.startsWith(monthKey(year, month)); date = addDays(date, 1)) {
    const lit = trained.has(date);
    if (lit) trainedDays += 1;
    cells.push({ date, day: Number(date.slice(8)), trained: lit, isToday: date === today, isFuture: date > today });
  }
  return { year, month, trainedDays, cells };
}

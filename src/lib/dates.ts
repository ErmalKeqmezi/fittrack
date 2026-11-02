/**
 * Timezone-aware calendar helpers. Dates are handled as "date keys"
 * (YYYY-MM-DD in the user's timezone) so that day and week buckets match
 * what the user sees on their own clock, independent of the server timezone.
 */

export type DateKey = string; // YYYY-MM-DD

const DAY_MS = 86_400_000;

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string) {
  let formatter = partsFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    partsFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Calendar date of an instant in the given timezone. */
export function toDateKey(instant: Date | string, timeZone: string): DateKey {
  const parts = partsFormatter(timeZone).formatToParts(new Date(instant));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function keyToUtcMs(key: DateKey) {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function utcMsToKey(ms: number): DateKey {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(key: DateKey, days: number): DateKey {
  return utcMsToKey(keyToUtcMs(key) + days * DAY_MS);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(key: DateKey) {
  const day = new Date(keyToUtcMs(key)).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Monday of the ISO week containing the date. */
export function startOfWeek(key: DateKey): DateKey {
  return addDays(key, 1 - isoWeekday(key));
}

export function startOfMonth(key: DateKey): DateKey {
  return `${key.slice(0, 7)}-01`;
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: DateKey, b: DateKey) {
  return Math.round((keyToUtcMs(b) - keyToUtcMs(a)) / DAY_MS);
}

/** Formats a date key without shifting it through a timezone. */
export function formatDateKey(key: DateKey, options: Intl.DateTimeFormatOptions, locale = "en-GB") {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(keyToUtcMs(key));
}

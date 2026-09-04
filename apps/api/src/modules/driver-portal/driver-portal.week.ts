/**
 * Settlement periods are cut Monday–Sunday, so the driver portal groups work into the same
 * weeks. Everything here operates on YYYY-MM-DD strings that were already resolved in the
 * business time zone, which keeps the grouping free of UTC day shifts.
 */
const WEEK_START_WEEKDAY = 1; // Monday

export function isoDayToUtcDate(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, date!));
}

export function utcDateToIsoDay(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

export function addDays(day: string, amount: number): string {
  const date = isoDayToUtcDate(day);
  date.setUTCDate(date.getUTCDate() + amount);
  return utcDateToIsoDay(date);
}

/** The Monday on or before `day`. */
export function weekStartOf(day: string): string {
  const date = isoDayToUtcDate(day);
  const offset = (date.getUTCDay() - WEEK_START_WEEKDAY + 7) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return utcDateToIsoDay(date);
}

export function weekEndOf(weekStart: string): string {
  return addDays(weekStart, 6);
}

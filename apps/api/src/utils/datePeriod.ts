/**
 * Parse YYYY-MM-DD (or ISO string) as a local calendar date (no UTC day shift).
 */
export function parseLocalDateInput(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const datePart = value.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) {
    return new Date(value);
  }
  return new Date(year, month - 1, day);
}

export function getPeriodBounds(periodStart: Date | string, periodEnd: Date | string) {
  const start = parseLocalDateInput(periodStart);
  start.setHours(0, 0, 0, 0);

  const end = parseLocalDateInput(periodEnd);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function compareCalendarDates(a: Date, b: Date): number {
  const aDay = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bDay = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return aDay - bDay;
}

/**
 * Pickup/delivery timestamps are entered as US Eastern wall-clock time by the UI, so their
 * calendar day has to be resolved in that zone. The API container runs on UTC, where an
 * evening delivery (8 PM ET or later) already belongs to the next day.
 */
export const BUSINESS_TIME_ZONE = process.env.BUSINESS_TIME_ZONE?.trim() || 'America/New_York';

const dayFormatters = new Map<string, Intl.DateTimeFormat>();

function dayFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = dayFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    dayFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** YYYY-MM-DD for an instant as seen in `timeZone`. */
export function calendarDayInZone(date: Date, timeZone: string = BUSINESS_TIME_ZONE): string {
  return dayFormatter(timeZone).format(date);
}

/** YYYY-MM-DD from the server-local parts, matching how getPeriodBounds builds its bounds. */
function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Inclusive check by calendar day for date-only values (deductions, credits) that are stored
 * at server-local midnight.
 */
export function isWithinPeriod(date: Date | string | null | undefined, start: Date, end: Date): boolean {
  if (!date) return false;
  const d = toDate(date);
  if (Number.isNaN(d.getTime())) return false;
  const day = localDay(d);
  return day >= localDay(start) && day <= localDay(end);
}

/**
 * Inclusive check for real timestamps (load pickup/delivery), resolving the calendar day in the
 * business time zone instead of the server's.
 */
export function isWithinPeriodInZone(
  date: Date | string | null | undefined,
  start: Date,
  end: Date,
  timeZone: string = BUSINESS_TIME_ZONE,
): boolean {
  if (!date) return false;
  const d = toDate(date);
  if (Number.isNaN(d.getTime())) return false;
  const day = calendarDayInZone(d, timeZone);
  return day >= localDay(start) && day <= localDay(end);
}

/**
 * The day a load counts toward a settlement week. When a load is delivered off-schedule the
 * actual delivery is what was worked, so it wins over the scheduled delivery date.
 */
export function getLoadWorkDate(load: {
  deliveryDate?: Date | null;
  actualDeliveryDate?: Date | null;
  pickupDate?: Date | null;
}): Date | null {
  return load.actualDeliveryDate ?? load.deliveryDate ?? load.pickupDate ?? null;
}

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

/** Inclusive check by calendar day (avoids UTC midnight shifting dates out of range). */
export function isWithinPeriod(date: Date | string | null | undefined, start: Date, end: Date): boolean {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return day >= startDay && day <= endDay;
}

export function getLoadWorkDate(load: {
  deliveryDate?: Date | null;
  actualDeliveryDate?: Date | null;
  pickupDate?: Date | null;
}): Date | null {
  return load.deliveryDate ?? load.actualDeliveryDate ?? load.pickupDate ?? null;
}

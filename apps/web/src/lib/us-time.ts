export type TimePeriod = 'AM' | 'PM';

export interface Time12Parts {
  hour: string;
  minute: string;
  period: TimePeriod;
}

export function time24ToParts(time24: string): Time12Parts {
  const [hourPart, minutePart = '00'] = time24.split(':');
  const minute = minutePart.padStart(2, '0').slice(0, 2);
  let hour24 = Number.parseInt(hourPart, 10);

  if (Number.isNaN(hour24)) {
    return { hour: '8', minute: '00', period: 'AM' };
  }

  const period: TimePeriod = hour24 >= 12 ? 'PM' : 'AM';
  if (hour24 === 0) hour24 = 12;
  else if (hour24 > 12) hour24 -= 12;

  return { hour: String(hour24), minute, period };
}

export function time12To24(hour: string, minute: string, period: TimePeriod): string {
  let hour24 = Number.parseInt(hour, 10);
  const minute24 = minute.padStart(2, '0').slice(0, 2);

  if (Number.isNaN(hour24) || hour24 < 1 || hour24 > 12) {
    hour24 = 8;
  }

  if (period === 'AM') {
    if (hour24 === 12) hour24 = 0;
  } else if (hour24 !== 12) {
    hour24 += 12;
  }

  return `${String(hour24).padStart(2, '0')}:${minute24}`;
}

function formatPartsInTimeZone(value: Date, timeZone: string) {
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const date = dateFormatter.format(value);
  const time = timeFormatter.format(value);
  return { date, time24: time };
}

function zonedWallClockToUtc(
  date: string,
  time24: string,
  timeZone: string = US_DISPLAY_TIME_ZONE,
): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time24.split(':').map(Number);

  let guess = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(guess))
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)]),
    ) as Record<string, number>;

    const rendered = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    const desired = Date.UTC(year, month - 1, day, hour, minute);
    guess += desired - rendered;
  }

  return new Date(guess).toISOString();
}

export function combineDateAndTime24(
  date: string,
  time24: string,
  timeZone: string = US_DISPLAY_TIME_ZONE,
): string {
  if (!date) return '';
  const time = time24 || '08:00';
  return zonedWallClockToUtc(date, time, timeZone);
}

export function splitIsoToDateAndTime24(
  iso: string | Date | null | undefined,
  timeZone: string = US_DISPLAY_TIME_ZONE,
): {
  date: string;
  time24: string;
} {
  if (!iso) return { date: '', time24: '08:00' };
  return formatPartsInTimeZone(new Date(iso), timeZone);
}

export function formatTimeAmPm(time24: string): string {
  const { hour, minute, period } = time24ToParts(time24);
  return `${hour}:${minute} ${period}`;
}

export const US_DISPLAY_TIME_ZONE = 'America/New_York';

export function formatDateTimeAmPm(
  value: string | Date,
  timeZone: string = US_DISPLAY_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  }).format(new Date(value));
}

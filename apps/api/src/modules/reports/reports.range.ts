import { Request } from 'express';
import { AppError } from '../../middleware/errorHandler.middleware';

const MAX_RANGE_MS = 400 * 24 * 60 * 60 * 1000;

function utcDayStart(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
}

function utcDayEnd(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
}

function parseYmd(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo || dt.getUTCDate() !== d) return null;
  return { y, m: mo, d };
}

export type ReportPreset = '30d' | '90d' | '6m' | '12m' | 'ytd';

export interface ReportDateRange {
  from: Date;
  to: Date;
  preset?: ReportPreset;
}

/** Inclusive rolling window ending today (UTC): last N calendar days including today. */
function rollingStartFromToday(numDays: number): Date {
  const now = new Date();
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth();
  const d = now.getUTCDate();
  const start = utcDayStart(y, mo, d);
  start.setUTCDate(start.getUTCDate() - (numDays - 1));
  return start;
}

/**
 * Resolve `from` / `to` (YYYY-MM-DD, UTC day bounds) or `preset` (30d|90d|6m|12m|ytd).
 * Custom `from` + `to` overrides `preset`.
 */
export function resolveReportDateRange(req: Request): ReportDateRange {
  const fromQ = typeof req.query.from === 'string' ? req.query.from.trim() : '';
  const toQ = typeof req.query.to === 'string' ? req.query.to.trim() : '';
  const presetRaw = typeof req.query.preset === 'string' ? req.query.preset.trim() : '';

  const now = new Date();
  const todayY = now.getUTCFullYear();
  const todayM = now.getUTCMonth();
  const todayD = now.getUTCDate();
  const to = utcDayEnd(todayY, todayM, todayD);

  if (fromQ && toQ) {
    const a = parseYmd(fromQ);
    const b = parseYmd(toQ);
    if (!a || !b) {
      throw new AppError(400, 'INVALID_RANGE', 'Use YYYY-MM-DD for from and to');
    }
    const from = utcDayStart(a.y, a.m, a.d);
    const toEnd = utcDayEnd(b.y, b.m, b.d);
    if (from > toEnd) {
      throw new AppError(400, 'INVALID_RANGE', 'from must be on or before to');
    }
    if (toEnd.getTime() - from.getTime() > MAX_RANGE_MS) {
      throw new AppError(400, 'RANGE_TOO_LONG', 'Maximum report range is 400 days');
    }
    return { from, to: toEnd };
  }

  const presets: ReportPreset[] = ['30d', '90d', '6m', '12m', 'ytd'];
  const preset = (presetRaw || '90d') as ReportPreset;
  if (!presets.includes(preset)) {
    throw new AppError(
      400,
      'INVALID_PRESET',
      'Provide from & to (YYYY-MM-DD) or preset=30d|90d|6m|12m|ytd'
    );
  }

  let from: Date;
  if (preset === 'ytd') {
    from = utcDayStart(todayY, 0, 1);
  } else if (preset === '30d') {
    from = rollingStartFromToday(30);
  } else if (preset === '90d') {
    from = rollingStartFromToday(90);
  } else if (preset === '6m') {
    from = rollingStartFromToday(183);
  } else {
    from = rollingStartFromToday(365);
  }

  if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
    throw new AppError(400, 'RANGE_TOO_LONG', 'Maximum report range is 400 days');
  }

  return { from, to, preset };
}

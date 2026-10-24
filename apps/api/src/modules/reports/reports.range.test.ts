import assert from 'node:assert';
import { describe, it } from 'node:test';
import type { Request } from 'express';
import { resolveReportDateRange } from './reports.range';
import { AppError } from '../../middleware/errorHandler.middleware';

function mockReq(query: Record<string, string>): Request {
  return { query } as unknown as Request;
}

describe('resolveReportDateRange', () => {
  it('accepts custom from and to (UTC day bounds)', () => {
    const range = resolveReportDateRange(
      mockReq({ from: '2025-03-01', to: '2025-03-15' })
    );
    assert.equal(range.from.toISOString().slice(0, 10), '2025-03-01');
    assert.equal(range.to.toISOString().slice(0, 10), '2025-03-15');
    assert.equal(range.preset, undefined);
  });

  it('defaults to the last 6 calendar months, starting on the 1st', () => {
    const range = resolveReportDateRange(mockReq({}));
    assert.equal(range.preset, '6m');
    const now = new Date();
    const expected = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    assert.equal(range.from.toISOString(), expected.toISOString());
  });

  it('starts the 3 month preset on the 1st of the month two months ago', () => {
    const range = resolveReportDateRange(mockReq({ preset: '90d' }));
    const now = new Date();
    assert.equal(range.from.getUTCDate(), 1);
    assert.equal(range.from.getUTCMonth(), new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1)).getUTCMonth());
  });

  it('rejects invalid date format', () => {
    assert.throws(
      () => resolveReportDateRange(mockReq({ from: '03-01-2025', to: '2025-03-15' })),
      (err: unknown) => err instanceof AppError && (err as AppError).code === 'INVALID_RANGE'
    );
  });

  it('rejects from after to', () => {
    assert.throws(
      () => resolveReportDateRange(mockReq({ from: '2025-06-01', to: '2025-01-01' })),
      (err: unknown) => err instanceof AppError && (err as AppError).code === 'INVALID_RANGE'
    );
  });

  it('rejects unknown preset', () => {
    assert.throws(
      () => resolveReportDateRange(mockReq({ preset: '7d' })),
      (err: unknown) => err instanceof AppError && (err as AppError).code === 'INVALID_PRESET'
    );
  });
});

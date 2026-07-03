import assert from 'node:assert';
import { describe, it } from 'node:test';
import { LoadStatus } from '@fleetos/shared-types';
import { calculateLoadTotalCents, inferInitialLoadStatus, nextLoadSequenceNumber } from './loads.logic';

describe('inferInitialLoadStatus', () => {
  it('returns explicit status when provided', () => {
    assert.equal(
      inferInitialLoadStatus({
        status: LoadStatus.IN_TRANSIT,
        deliveryDate: new Date('2099-01-01'),
      }),
      LoadStatus.IN_TRANSIT,
    );
  });

  it('returns DELIVERED when delivery date is in the past', () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    assert.equal(
      inferInitialLoadStatus({ deliveryDate: past }),
      LoadStatus.DELIVERED,
    );
  });

  it('returns DELIVERED when delivery date is now', () => {
    assert.equal(
      inferInitialLoadStatus({ deliveryDate: new Date() }),
      LoadStatus.DELIVERED,
    );
  });

  it('returns PENDING when delivery date is in the future', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    assert.equal(
      inferInitialLoadStatus({ deliveryDate: future }),
      LoadStatus.PENDING,
    );
  });
});

describe('nextLoadSequenceNumber', () => {
  it('returns 1 when no loads exist for the year', () => {
    assert.equal(nextLoadSequenceNumber([], 2026), 1);
  });

  it('uses highest existing sequence, not row count', () => {
    assert.equal(
      nextLoadSequenceNumber(
        ['VT-2026-00001', 'VT-2026-00009', 'VT-2026-00017'],
        2026,
      ),
      18,
    );
  });

  it('ignores other years and prefixes', () => {
    assert.equal(
      nextLoadSequenceNumber(['VT-2025-00099', 'LD-2026-00004', 'VT-2026-00003'], 2026),
      4,
    );
  });
});

describe('calculateLoadTotalCents', () => {
  it('flat rate plus accessorials', () => {
    const total = calculateLoadTotalCents({
      rateType: 'FLAT',
      rateCents: 100_000,
      loadedMiles: 500,
      deadheadMiles: 50,
      detentionCents: 5_000,
      lumperCents: 2_000,
      otherChargesCents: 1_000,
    });
    assert.equal(total, 108_000);
  });

  it('per-mile rate uses loaded + deadhead miles', () => {
    const total = calculateLoadTotalCents({
      rateType: 'PER_MILE',
      rateCents: 200,
      loadedMiles: 800,
      deadheadMiles: 200,
      detentionCents: 0,
      lumperCents: 0,
      otherChargesCents: 0,
    });
    assert.equal(total, 200_000);
  });
});

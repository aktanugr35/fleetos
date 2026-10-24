import assert from 'node:assert';
import { describe, it } from 'node:test';
import { summarizeFees, type FeeLoad } from './factoring.fees';

function load(overrides: Partial<FeeLoad>): FeeLoad {
  return {
    rateTotal: 100_000,
    detentionPay: null,
    lumperFee: null,
    tonuAmount: null,
    factoringFeeCents: 3_000,
    billingSubmittedAt: null,
    actualDeliveryDate: null,
    deliveryDate: null,
    pickupDate: new Date('2026-09-10T15:00:00Z'),
    ...overrides,
  };
}

describe('summarizeFees', () => {
  it('totals fees and the gross amount of the loads they were charged on', () => {
    const result = summarizeFees([
      load({ factoringFeeCents: 2_500, detentionPay: 5_000 }),
      load({ factoringFeeCents: 4_000, rateTotal: 200_000 }),
    ]);
    assert.strictEqual(result.totalFeeCents, 6_500);
    assert.strictEqual(result.grossCents, 305_000);
    assert.strictEqual(result.loadCount, 2);
  });

  it('groups by submit month first, newest month first, in New York time', () => {
    const result = summarizeFees([
      load({ billingSubmittedAt: new Date('2026-10-01T02:00:00Z') }),
      load({ deliveryDate: new Date('2026-10-15T15:00:00Z') }),
      load({}),
    ]);
    assert.deepStrictEqual(
      result.byMonth.map((m) => [m.month, m.loadCount]),
      [
        ['2026-10', 1],
        ['2026-09', 2],
      ],
    );
  });

  it('returns zeros when no fees were entered', () => {
    assert.deepStrictEqual(summarizeFees([]), { totalFeeCents: 0, grossCents: 0, loadCount: 0, byMonth: [] });
  });
});

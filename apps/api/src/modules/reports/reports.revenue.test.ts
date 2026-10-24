import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  buildMonthlySeries,
  currentMonthDeliveredGrossCents,
  earnsRevenue,
  effectiveDeliveryDate,
  grossLineCents,
  revenueDate,
  sumDeliveredGrossByDeliveryMonth,
} from './reports.revenue';

describe('reports.revenue', () => {
  it('grossLineCents sums all load revenue fields', () => {
    assert.equal(
      grossLineCents({
        rateTotal: 100_000,
        detentionPay: 5_000,
        lumperFee: 2_000,
        fuelSurcharge: 1_000,
        tonuAmount: 500,
      }),
      108_500,
    );
  });

  it('prefers actualDeliveryDate over deliveryDate', () => {
    const actual = new Date(2026, 6, 2);
    const scheduled = new Date(2026, 5, 28);
    assert.equal(
      effectiveDeliveryDate({ actualDeliveryDate: actual, deliveryDate: scheduled })?.getTime(),
      actual.getTime(),
    );
  });

  it('groups revenue by delivery month using full gross', () => {
    const grouped = sumDeliveredGrossByDeliveryMonth([
      {
        rateTotal: 200_000,
        detentionPay: 0,
        lumperFee: 0,
        fuelSurcharge: 0,
        tonuAmount: 0,
        deliveryDate: new Date(2026, 5, 15),
        actualDeliveryDate: null,
      },
      {
        rateTotal: 100_000,
        detentionPay: 10_000,
        lumperFee: 0,
        fuelSurcharge: 0,
        tonuAmount: 0,
        deliveryDate: new Date(2026, 6, 1),
        actualDeliveryDate: new Date(2026, 6, 3),
      },
    ]);

    assert.equal(grouped.get('2026-06'), 200_000);
    assert.equal(grouped.get('2026-07'), 110_000);
  });

  it('currentMonthDeliveredGrossCents only counts anchor month deliveries', () => {
    const anchor = new Date(2026, 6, 10);
    const total = currentMonthDeliveredGrossCents(
      [
        {
          rateTotal: 50_000,
          detentionPay: 0,
          lumperFee: 0,
          fuelSurcharge: 0,
          tonuAmount: 0,
          deliveryDate: new Date(2026, 6, 1),
          actualDeliveryDate: null,
        },
        {
          rateTotal: 99_000,
          detentionPay: 0,
          lumperFee: 0,
          fuelSurcharge: 0,
          tonuAmount: 0,
          deliveryDate: new Date(2026, 5, 30),
          actualDeliveryDate: null,
        },
      ],
      anchor,
    );
    assert.equal(total, 50_000);
  });

  it('buildMonthlySeries fills empty months and flags partial ones', () => {
    const series = buildMonthlySeries(
      new Date('2026-07-27T00:00:00Z'),
      new Date('2026-10-24T23:59:59.999Z'),
      new Map([
        [
          '2026-09',
          [
            {
              id: 'a',
              loadNumber: 'L1',
              puNumber: null,
              brokerName: 'B',
              status: 'DELIVERED' as const,
              revenueDate: '2026-09-03T00:00:00.000Z',
              amountCents: 120_000,
            },
          ],
        ],
      ]),
    );
    assert.deepEqual(
      series.map((m) => [m.monthKey, m.revenueCents, m.partial]),
      [
        ['2026-07', 0, true],
        ['2026-08', 0, false],
        ['2026-09', 120_000, false],
        ['2026-10', 0, true],
      ],
    );
  });

  it('counts delivered and TONU loads as revenue, nothing else', () => {
    assert.deepEqual(
      (['PENDING', 'IN_TRANSIT', 'DELIVERED', 'TONU', 'CANCELLED'] as const).filter(earnsRevenue),
      ['DELIVERED', 'TONU'],
    );
  });

  it('falls back to pickup date when a delivered load has no delivery date', () => {
    assert.equal(
      revenueDate({ actualDeliveryDate: null, deliveryDate: null, pickupDate: new Date(2026, 6, 4) })?.getTime(),
      new Date(2026, 6, 4).getTime(),
    );
    const total = currentMonthDeliveredGrossCents(
      [
        {
          rateTotal: 70_000,
          detentionPay: 0,
          lumperFee: 0,
          fuelSurcharge: 0,
          tonuAmount: 0,
          deliveryDate: null,
          actualDeliveryDate: null,
          pickupDate: new Date(2026, 6, 4),
        },
      ],
      new Date(2026, 6, 10),
    );
    assert.equal(total, 70_000);
  });
});

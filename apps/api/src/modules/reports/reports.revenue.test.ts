import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  currentMonthDeliveredGrossCents,
  effectiveDeliveryDate,
  grossLineCents,
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
});

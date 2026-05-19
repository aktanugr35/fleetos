import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  calculateLoadSettlementAmounts,
  driverPayCents,
  grossRevenueFromLoad,
  resolveLoadRole,
} from './settlements.eligible';

describe('grossRevenueFromLoad', () => {
  it('sums rate and accessorial fields', () => {
    assert.equal(
      grossRevenueFromLoad({
        rateTotal: 500_000,
        detentionPay: 10_000,
        lumperFee: 5_000,
        tonuAmount: 2_000,
      }),
      517_000,
    );
  });

  it('treats null accessorials as zero', () => {
    assert.equal(
      grossRevenueFromLoad({
        rateTotal: 100_000,
        detentionPay: null,
        lumperFee: null,
        tonuAmount: null,
      }),
      100_000,
    );
  });
});

describe('resolveLoadRole', () => {
  it('returns OWNER_DRIVER when driver and owner both apply', () => {
    assert.equal(resolveLoadRole(true, true), 'OWNER_DRIVER');
  });

  it('returns OWNER for owner-only', () => {
    assert.equal(resolveLoadRole(false, true), 'OWNER');
  });

  it('returns DRIVER for driver-only', () => {
    assert.equal(resolveLoadRole(true, false), 'DRIVER');
  });
});

describe('calculateLoadSettlementAmounts', () => {
  const gross = 1_000_000; // $10,000
  const ooRate = 1200; // 12%

  it('OWNER_DRIVER: gross minus company commission', () => {
    const result = calculateLoadSettlementAmounts({
      role: 'OWNER_DRIVER',
      grossRevenueCents: gross,
      payStructure: 'PERCENTAGE',
      payRate: 8800,
      totalMiles: 0,
      companyCommissionRateHundredths: ooRate,
    });
    assert.equal(result.companyCommissionCents, 120_000);
    assert.equal(result.calculatedGrossCents, 880_000);
  });

  it('OWNER: gross minus commission minus driver pay', () => {
    const driverPay = driverPayCents(gross, 'PERCENTAGE', 8800, 0);
    const result = calculateLoadSettlementAmounts({
      role: 'OWNER',
      grossRevenueCents: gross,
      payStructure: 'PERCENTAGE',
      payRate: 8800,
      totalMiles: 0,
      companyCommissionRateHundredths: ooRate,
    });
    assert.equal(result.companyCommissionCents, 120_000);
    assert.equal(result.calculatedGrossCents, gross - 120_000 - driverPay);
  });

  it('DRIVER: company driver receives percentage pay only', () => {
    const result = calculateLoadSettlementAmounts({
      role: 'DRIVER',
      grossRevenueCents: gross,
      payStructure: 'PERCENTAGE',
      payRate: 6000,
      totalMiles: 0,
      companyCommissionRateHundredths: ooRate,
    });
    assert.equal(result.companyCommissionCents, 0);
    assert.equal(result.calculatedGrossCents, 600_000);
  });

  it('DRIVER per-mile pay', () => {
    const result = calculateLoadSettlementAmounts({
      role: 'DRIVER',
      grossRevenueCents: gross,
      payStructure: 'PER_MILE',
      payRate: 60,
      totalMiles: 1000,
      companyCommissionRateHundredths: ooRate,
    });
    assert.equal(result.calculatedGrossCents, 60_000);
  });
});

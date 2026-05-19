import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  calculatePercentage,
  calculatePerMile,
  centsToDollars,
  dollarsToCents,
  formatCentsToUSD,
  parseDollarsToCents,
} from './currency';

describe('currency utils', () => {
  it('converts dollars to cents', () => {
    assert.equal(dollarsToCents(12.34), 1234);
  });

  it('formats USD', () => {
    assert.equal(formatCentsToUSD(123456), '$1,234.56');
  });

  it('parses dollar strings to cents', () => {
    assert.equal(parseDollarsToCents('12.34'), 1234);
  });

  it('calculates percentage', () => {
    assert.equal(calculatePercentage(500_000, 1200), 60_000);
  });

  it('calculates per-mile', () => {
    assert.equal(calculatePerMile(100, 60), 6000);
  });

  it('converts cents to dollars', () => {
    assert.equal(centsToDollars(1234), 12.34);
  });
});

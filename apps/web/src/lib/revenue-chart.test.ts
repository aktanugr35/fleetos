import assert from 'node:assert';
import { describe, it } from 'node:test';
import { monthKeyFromChartPoint } from './revenue-chart';

describe('monthKeyFromChartPoint', () => {
  it('parses ISO month keys', () => {
    assert.equal(monthKeyFromChartPoint('2026-07'), '2026-07');
  });

  it('parses locale month labels used by the API', () => {
    assert.equal(monthKeyFromChartPoint('Jul 2026'), '2026-07');
    assert.equal(monthKeyFromChartPoint('Feb 2026'), '2026-02');
  });

  it('returns null for invalid values', () => {
    assert.equal(monthKeyFromChartPoint('not-a-month'), null);
  });
});

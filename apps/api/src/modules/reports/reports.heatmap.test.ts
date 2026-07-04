import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  buildHeatmapAvailablePeriods,
  parsePickupStateCode,
  resolveHeatmapPeriod,
  scoreHeatmapRows,
} from './reports.heatmap';

describe('reports.heatmap', () => {
  it('parses pickup state code from location string', () => {
    assert.equal(parsePickupStateCode('Atlanta, GA'), 'GA');
    assert.equal(parsePickupStateCode('Seattle, wa'), 'WA');
    assert.equal(parsePickupStateCode('Unknown'), null);
  });

  it('resolves monthly period key and boundaries', () => {
    const period = resolveHeatmapPeriod('month', '2026-07', new Date('2026-07-15T10:00:00Z'));
    assert.equal(period.key, '2026-07');
    assert.equal(period.start.getFullYear(), 2026);
    assert.equal(period.start.getMonth(), 6);
    assert.equal(period.endExclusive.getMonth(), 7);
  });

  it('resolves weekly period from day key to monday week start', () => {
    const period = resolveHeatmapPeriod('week', '2026-07-05', new Date('2026-07-05T10:00:00Z'));
    // 2026-07-05 is Sunday; Monday week start should be 2026-06-29 (local calendar).
    assert.equal(period.start.getFullYear(), 2026);
    assert.equal(period.start.getMonth(), 5);
    assert.equal(period.start.getDate(), 29);
    assert.equal(period.endExclusive.getFullYear(), 2026);
    assert.equal(period.endExclusive.getMonth(), 6);
    assert.equal(period.endExclusive.getDate(), 6);
  });

  it('builds available monthly periods newest-first', () => {
    const periods = buildHeatmapAvailablePeriods('month', 3, new Date('2026-07-15T00:00:00Z'));
    assert.deepEqual(
      periods.map((p) => p.key),
      ['2026-07', '2026-06', '2026-05'],
    );
  });

  it('scores rows and assigns heat buckets', () => {
    const scored = scoreHeatmapRows([
      { stateCode: 'TX', loadCount: 40, revenueCents: 900000, avgWaitDays: 1.5 },
      { stateCode: 'GA', loadCount: 20, revenueCents: 350000, avgWaitDays: 1.0 },
      { stateCode: 'MT', loadCount: 2, revenueCents: 15000, avgWaitDays: 0.2 },
    ]);
    const tx = scored.find((s) => s.stateCode === 'TX');
    const mt = scored.find((s) => s.stateCode === 'MT');
    assert.ok(tx && tx.score >= 75);
    assert.equal(tx?.bucket, 'hot');
    assert.ok(mt && mt.score < 25);
    assert.equal(mt?.bucket, 'cold');
  });
});

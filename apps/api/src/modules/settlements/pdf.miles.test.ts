import assert from 'node:assert';
import { describe, it } from 'node:test';
import { getLoadMiles, sumSettlementLineMiles } from './pdf.miles';

describe('getLoadMiles', () => {
  it('defaults null miles to zero', () => {
    assert.deepEqual(getLoadMiles({}), {
      loadedMiles: 0,
      deadheadMiles: 0,
      totalMiles: 0,
    });
  });

  it('computes total from loaded + deadhead when totalMiles omitted', () => {
    assert.deepEqual(
      getLoadMiles({ loadedMiles: 400, deadheadMiles: 60 }),
      { loadedMiles: 400, deadheadMiles: 60, totalMiles: 460 },
    );
  });

  it('uses explicit totalMiles when set', () => {
    assert.deepEqual(
      getLoadMiles({ loadedMiles: 100, deadheadMiles: 20, totalMiles: 500 }),
      { loadedMiles: 100, deadheadMiles: 20, totalMiles: 500 },
    );
  });
});

describe('sumSettlementLineMiles', () => {
  it('aggregates deadhead and loaded across trip lines', () => {
    const totals = sumSettlementLineMiles([
      { loadedMiles: 300, deadheadMiles: 50 },
      { loadedMiles: 200, deadheadMiles: 25 },
    ]);
    assert.equal(totals.totalLoadedMiles, 500);
    assert.equal(totals.totalDeadheadMiles, 75);
    assert.equal(totals.totalMilesCount, 575);
  });
});

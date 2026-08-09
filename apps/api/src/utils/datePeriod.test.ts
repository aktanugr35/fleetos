import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  calendarDayInZone,
  getLoadWorkDate,
  getPeriodBounds,
  isWithinPeriod,
  isWithinPeriodInZone,
} from './datePeriod';

const ET = 'America/New_York';

describe('calendarDayInZone', () => {
  it('keeps an evening Eastern timestamp on its Eastern day', () => {
    // Aug 2 2026, 9:30 PM EDT
    assert.equal(calendarDayInZone(new Date('2026-08-03T01:30:00.000Z'), ET), '2026-08-02');
  });

  it('rolls a late-night Eastern timestamp to the next Eastern day', () => {
    // Aug 3 2026, 12:30 AM EDT
    assert.equal(calendarDayInZone(new Date('2026-08-03T04:30:00.000Z'), ET), '2026-08-03');
  });
});

describe('isWithinPeriodInZone', () => {
  const { start, end } = getPeriodBounds('2026-07-27', '2026-08-02');

  it('includes a load delivered on the last evening of the period', () => {
    // 8 PM ET on Aug 2 is already Aug 3 in UTC — it still belongs to this settlement week.
    const delivered = new Date('2026-08-03T00:00:00.000Z');
    assert.equal(isWithinPeriodInZone(delivered, start, end, ET), true);
  });

  it('excludes a load delivered the evening before the period starts', () => {
    // 9 PM ET on Jul 26 is Jul 27 in UTC, but belongs to the previous week.
    const delivered = new Date('2026-07-27T01:00:00.000Z');
    assert.equal(isWithinPeriodInZone(delivered, start, end, ET), false);
  });

  it('includes a midday delivery inside the period', () => {
    assert.equal(isWithinPeriodInZone(new Date('2026-07-30T16:00:00.000Z'), start, end, ET), true);
  });

  it('excludes a delivery after the period', () => {
    assert.equal(isWithinPeriodInZone(new Date('2026-08-04T16:00:00.000Z'), start, end, ET), false);
  });

  it('treats a missing work date as out of period', () => {
    assert.equal(isWithinPeriodInZone(null, start, end, ET), false);
  });
});

describe('isWithinPeriod', () => {
  const { start, end } = getPeriodBounds('2026-07-27', '2026-08-02');

  it('keeps date-only values on the day they were saved', () => {
    assert.equal(isWithinPeriod(new Date(2026, 7, 2), start, end), true);
    assert.equal(isWithinPeriod(new Date(2026, 7, 3), start, end), false);
    assert.equal(isWithinPeriod(new Date(2026, 6, 26), start, end), false);
  });
});

describe('getLoadWorkDate', () => {
  it('prefers the actual delivery date over the scheduled one', () => {
    const actual = new Date('2026-08-01T18:00:00.000Z');
    const workDate = getLoadWorkDate({
      deliveryDate: new Date('2026-08-05T18:00:00.000Z'),
      actualDeliveryDate: actual,
      pickupDate: new Date('2026-07-30T18:00:00.000Z'),
    });
    assert.equal(workDate?.toISOString(), actual.toISOString());
  });

  it('falls back to the scheduled delivery date, then pickup', () => {
    const scheduled = new Date('2026-08-05T18:00:00.000Z');
    assert.equal(
      getLoadWorkDate({ deliveryDate: scheduled, actualDeliveryDate: null })?.toISOString(),
      scheduled.toISOString(),
    );

    const pickup = new Date('2026-07-30T18:00:00.000Z');
    assert.equal(
      getLoadWorkDate({ deliveryDate: null, actualDeliveryDate: null, pickupDate: pickup })?.toISOString(),
      pickup.toISOString(),
    );
  });
});

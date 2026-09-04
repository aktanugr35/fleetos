import assert from 'node:assert';
import { describe, it } from 'node:test';
import { addDays, weekEndOf, weekStartOf } from './driver-portal.week';

describe('driver portal week grouping', () => {
  it('snaps every day of a settlement week to its Monday', () => {
    // 2026-07-27 is the Monday of the July 27 – August 2 settlement week.
    assert.equal(weekStartOf('2026-07-27'), '2026-07-27');
    assert.equal(weekStartOf('2026-07-31'), '2026-07-27');
    assert.equal(weekStartOf('2026-08-02'), '2026-07-27');
    assert.equal(weekStartOf('2026-08-03'), '2026-08-03');
  });

  it('closes the week on Sunday', () => {
    assert.equal(weekEndOf('2026-07-27'), '2026-08-02');
  });

  it('crosses month and year boundaries', () => {
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
    assert.equal(weekStartOf('2027-01-01'), '2026-12-28');
  });
});

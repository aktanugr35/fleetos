import assert from 'node:assert';
import { describe, it } from 'node:test';
import { combineDateAndTime24, time12To24, time24ToParts } from './us-time';

describe('time24ToParts', () => {
  it('converts morning and afternoon times', () => {
    assert.deepEqual(time24ToParts('08:00'), { hour: '8', minute: '00', period: 'AM' });
    assert.deepEqual(time24ToParts('17:30'), { hour: '5', minute: '30', period: 'PM' });
    assert.deepEqual(time24ToParts('00:15'), { hour: '12', minute: '15', period: 'AM' });
  });
});

describe('time12To24', () => {
  it('round-trips common dispatch times', () => {
    assert.equal(time12To24('8', '00', 'AM'), '08:00');
    assert.equal(time12To24('5', '30', 'PM'), '17:30');
    assert.equal(time12To24('12', '00', 'AM'), '00:00');
    assert.equal(time12To24('12', '00', 'PM'), '12:00');
  });
});

describe('combineDateAndTime24', () => {
  it('builds an ISO timestamp from local date and 24h time', () => {
    const iso = combineDateAndTime24('2026-07-06', '08:00');
    assert.match(iso, /^2026-07-06T/);
  });
});

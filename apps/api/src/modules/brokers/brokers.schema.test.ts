import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createBrokerSchema, normalizeMcNumber } from './brokers.schema';

describe('normalizeMcNumber', () => {
  it('strips the MC prefix, punctuation and spaces', () => {
    assert.equal(normalizeMcNumber('MC-123456'), '123456');
    assert.equal(normalizeMcNumber('mc 123456'), '123456');
    assert.equal(normalizeMcNumber('  123456  '), '123456');
    assert.equal(normalizeMcNumber('MC#123.456'), '123456');
  });

  it('returns an empty string when there are no digits', () => {
    assert.equal(normalizeMcNumber('MC'), '');
  });
});

describe('createBrokerSchema', () => {
  it('stores the MC number digits-only and trims the name', () => {
    const parsed = createBrokerSchema.parse({ name: '  TQL  ', mcNumber: 'MC-123456' });
    assert.equal(parsed.name, 'TQL');
    assert.equal(parsed.mcNumber, '123456');
  });

  it('rejects an MC number without enough digits', () => {
    assert.equal(createBrokerSchema.safeParse({ name: 'TQL', mcNumber: 'MC' }).success, false);
    assert.equal(createBrokerSchema.safeParse({ name: 'TQL', mcNumber: '12' }).success, false);
  });

  it('rejects an empty broker name', () => {
    assert.equal(createBrokerSchema.safeParse({ name: '   ', mcNumber: '123456' }).success, false);
  });

  it('drops blank optional fields', () => {
    const parsed = createBrokerSchema.parse({
      name: 'TQL',
      mcNumber: '123456',
      contactName: '',
      phone: '  ',
    });
    assert.equal(parsed.contactName, undefined);
    assert.equal(parsed.phone, undefined);
  });
});

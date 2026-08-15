import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createBrokerAgentSchema, createBrokerSchema, normalizeMcNumber } from './brokers.schema';

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
      address: '',
      notes: '  ',
    });
    assert.equal(parsed.address, undefined);
    assert.equal(parsed.notes, undefined);
  });
});

describe('createBrokerAgentSchema', () => {
  it('trims the agent name and keeps contact details', () => {
    const parsed = createBrokerAgentSchema.parse({
      name: '  Mike Ross  ',
      email: 'mike@tql.com',
      phone: '555-1234',
    });
    assert.equal(parsed.name, 'Mike Ross');
    assert.equal(parsed.email, 'mike@tql.com');
    assert.equal(parsed.phone, '555-1234');
  });

  it('rejects an empty name and an invalid email', () => {
    assert.equal(createBrokerAgentSchema.safeParse({ name: '  ' }).success, false);
    assert.equal(
      createBrokerAgentSchema.safeParse({ name: 'Mike', email: 'not-an-email' }).success,
      false,
    );
  });

  it('accepts an agent with just a name', () => {
    assert.equal(createBrokerAgentSchema.safeParse({ name: 'Mike Ross' }).success, true);
  });
});

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createBrokerResolver, normalizeBrokerName } from './broker-identity';

const megacorp = { id: 'b1', name: 'MegaCorp Logistics LLC', mcNumber: '123456' };
const resolve = createBrokerResolver([megacorp, { id: 'b2', name: 'Other Freight', mcNumber: '999' }]);

describe('normalizeBrokerName', () => {
  it('ignores case, punctuation and company suffixes', () => {
    assert.equal(normalizeBrokerName('MegaCorp Logistics, LLC.'), 'megacorp logistics');
    assert.equal(normalizeBrokerName('  megacorp   logistics inc '), 'megacorp logistics');
  });
});

describe('createBrokerResolver', () => {
  it('groups a linked load and a legacy load with the same MC', () => {
    const linked = resolve({ brokerId: 'b1', brokerMC: '123456', brokerName: 'MegaCorp Logistics LLC' });
    const legacy = resolve({ brokerId: null, brokerMC: 'MC-123456', brokerName: 'Megacorp' });
    assert.deepEqual(legacy, linked);
    assert.equal(linked.name, 'MegaCorp Logistics LLC');
  });

  it('falls back to the normalized name when there is no MC', () => {
    const legacy = resolve({ brokerId: null, brokerMC: null, brokerName: 'megacorp logistics' });
    assert.equal(legacy.key, 'broker:b1');
  });

  it('keeps unknown brokers grouped by normalized name', () => {
    const a = resolve({ brokerId: null, brokerMC: null, brokerName: 'Acme Freight Inc' });
    const b = resolve({ brokerId: null, brokerMC: '', brokerName: 'ACME FREIGHT' });
    assert.equal(a.key, b.key);
  });
});

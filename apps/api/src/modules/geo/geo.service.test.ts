import assert from 'node:assert';
import { describe, it } from 'node:test';
import { normalizeUsZip } from './geo.service';

describe('normalizeUsZip', () => {
  it('strips non-digits and keeps first five', () => {
    assert.equal(normalizeUsZip('90210'), '90210');
    assert.equal(normalizeUsZip('90210-1234'), '90210');
    assert.equal(normalizeUsZip(' 75-001 '), '75001');
  });
});

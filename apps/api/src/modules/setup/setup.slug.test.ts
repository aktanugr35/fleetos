import assert from 'node:assert';
import { describe, it } from 'node:test';
import { slugifyCompanyName } from './setup.service';

describe('slugifyCompanyName', () => {
  it('lowercases and hyphenates', () => {
    assert.equal(slugifyCompanyName('Valley Transportation LLC'), 'valley-transportation-llc');
  });

  it('strips leading and trailing hyphens', () => {
    assert.equal(slugifyCompanyName('  ---Acme---  '), 'acme');
  });

  it('falls back when only symbols', () => {
    assert.equal(slugifyCompanyName('!!!'), 'company');
  });

  it('truncates long names', () => {
    const long = 'a'.repeat(80);
    assert.equal(slugifyCompanyName(long).length, 48);
  });
});

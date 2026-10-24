import assert from 'node:assert';
import { describe, it } from 'node:test';
import { nextSequence } from './statement-number';

describe('nextSequence', () => {
  it('continues after the highest number, even with gaps from deleted statements', () => {
    assert.equal(nextSequence(['SET-2026-00002', 'SET-2026-00003', null], 'SET-2026-'), 4);
  });

  it('starts at 1 for a new year or an empty company', () => {
    assert.equal(nextSequence(['SET-2025-00041'], 'SET-2026-'), 1);
    assert.equal(nextSequence([], 'SET-2026-'), 1);
  });
});

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { AxiosError } from 'axios';
import { getApiErrorMessage } from './api-errors';

describe('getApiErrorMessage', () => {
  it('extracts API error message', () => {
    const err = new AxiosError('Request failed');
    err.response = {
      data: { error: { message: 'Invalid credentials' } },
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: {} as never,
    };
    assert.equal(getApiErrorMessage(err, 'fallback'), 'Invalid credentials');
  });

  it('uses fallback for unknown errors', () => {
    assert.equal(getApiErrorMessage(new Error('network'), 'fallback'), 'network');
    assert.equal(getApiErrorMessage({}, 'fallback'), 'fallback');
  });
});

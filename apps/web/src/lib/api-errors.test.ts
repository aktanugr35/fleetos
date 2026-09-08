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

  it('explains HTTP 413 from a reverse proxy HTML response', () => {
    const err = new AxiosError('Request failed with status code 413');
    err.response = {
      data: '<html>413 Request Entity Too Large</html>',
      status: 413,
      statusText: 'Payload Too Large',
      headers: {},
      config: {} as never,
    };
    assert.match(getApiErrorMessage(err, 'fallback'), /too large/i);
  });

  it('uses fallback for unknown errors', () => {
    assert.equal(getApiErrorMessage(new Error('network'), 'fallback'), 'network');
    assert.equal(getApiErrorMessage({}, 'fallback'), 'fallback');
  });
});

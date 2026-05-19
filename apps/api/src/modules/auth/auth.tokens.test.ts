import assert from 'node:assert';
import { describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import { signAccessToken, verifyAccessToken } from './auth.tokens';

const SECRET = 'test-access-secret-min-10-chars';

describe('auth tokens', () => {
  const payload = {
    userId: 'user-1',
    email: 'admin@test.com',
    role: 'COMPANY_ADMIN',
    companyId: 'company-1',
  };

  it('signs and verifies access token', () => {
    const token = signAccessToken(payload, SECRET, '1h');
    const decoded = verifyAccessToken(token, SECRET);
    assert.equal(decoded.userId, payload.userId);
    assert.equal(decoded.email, payload.email);
    assert.equal(decoded.role, payload.role);
    assert.equal(decoded.companyId, payload.companyId);
  });

  it('rejects invalid token', () => {
    assert.throws(
      () => verifyAccessToken('not-a-jwt', SECRET),
      (err: unknown) => err instanceof jwt.JsonWebTokenError,
    );
  });

  it('rejects token signed with wrong secret', () => {
    const token = signAccessToken(payload, SECRET);
    assert.throws(
      () => verifyAccessToken(token, 'other-secret-min-10-chars'),
      (err: unknown) => err instanceof jwt.JsonWebTokenError,
    );
  });
});

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { loginSchema } from './auth.schema';

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.parse({
      email: 'Admin@Test.COM',
      password: 'secret1',
    });
    assert.equal(result.email, 'admin@test.com');
    assert.equal(result.password, 'secret1');
  });

  it('rejects invalid email', () => {
    assert.throws(() =>
      loginSchema.parse({ email: 'not-email', password: 'secret1' }),
    );
  });

  it('rejects short password', () => {
    assert.throws(() =>
      loginSchema.parse({ email: 'a@test.com', password: '12345' }),
    );
  });
});

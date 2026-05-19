import assert from 'node:assert';
import { describe, it } from 'node:test';

describe('production env validation', () => {
  it('rejects short JWT secrets in production', async () => {
    const { z } = await import('zod');

    const schema = z
      .object({
        NODE_ENV: z.enum(['development', 'staging', 'production']),
        JWT_ACCESS_SECRET: z.string().min(10),
        JWT_REFRESH_SECRET: z.string().min(10),
        AWS_ACCESS_KEY_ID: z.string().optional(),
        AWS_SECRET_ACCESS_KEY: z.string().optional(),
        SEED_DEMO: z.boolean().optional(),
      })
      .superRefine((data, ctx) => {
        if (data.NODE_ENV !== 'production') return;
        if (data.JWT_ACCESS_SECRET.length < 32) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['JWT_ACCESS_SECRET'], message: 'short' });
        }
        if (!data.AWS_ACCESS_KEY_ID) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['AWS_ACCESS_KEY_ID'], message: 's3' });
        }
        if (data.SEED_DEMO) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['SEED_DEMO'], message: 'seed' });
        }
      });

    const bad = schema.safeParse({
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'too-short',
      JWT_REFRESH_SECRET: 'also-too-short-for-production',
      SEED_DEMO: false,
    });
    assert.equal(bad.success, false);

    const good = schema.safeParse({
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      AWS_ACCESS_KEY_ID: 'key',
      AWS_SECRET_ACCESS_KEY: 'secret',
      SEED_DEMO: false,
    });
    assert.equal(good.success, true);
  });
});

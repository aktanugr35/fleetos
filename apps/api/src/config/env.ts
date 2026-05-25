import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Local monorepo root .env (optional on Render/Vercel — platform env vars used there)
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DEV_JWT_PLACEHOLDERS = new Set([
  'fleetos-dev-access-secret-change-in-production',
  'fleetos-dev-refresh-secret-change-in-production',
]);

const isProdLike = (nodeEnv: string) =>
  nodeEnv === 'production' || nodeEnv === 'staging';

/** http(s) origins including IP:port (Zod .url() often rejects bare IPs). */
const httpOriginUrl = z.string().refine(
  (val) => {
    try {
      const u = new URL(val);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  },
  { message: 'Must be a valid http(s) URL' },
);

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().default('redis://localhost:6379'),

    JWT_ACCESS_SECRET: z.string().min(10),
    JWT_REFRESH_SECRET: z.string().min(10),
    JWT_ACCESS_EXPIRES: z.string().default('15m'),
    JWT_REFRESH_EXPIRES: z.string().default('7d'),

    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_REGION: z.string().default('us-east-1'),
    S3_BUCKET_NAME: z.string().min(1).default('fleetos-documents'),

    RESEND_API_KEY: z.string().optional(),
    FROM_EMAIL: z.string().email().default('noreply@fleetos.app'),

    NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
    API_PORT: z.preprocess(
      (v) => Number(process.env.PORT ?? process.env.API_PORT ?? v ?? 3001),
      z.number().int().positive(),
    ),
    FRONTEND_URL: httpOriginUrl.default('http://localhost:3000'),
    /** Comma-separated extra CORS origins (e.g. Vercel preview URLs). */
    CORS_ORIGINS: z.string().optional(),

    SEED_DEMO: z
      .enum(['true', 'false', '1', '0', ''])
      .optional()
      .transform((v) => v === 'true' || v === '1'),

    SENTRY_DSN: z.preprocess(
      (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
      z.string().url().optional(),
    ),
  })
  .superRefine((data, ctx) => {
    if (!isProdLike(data.NODE_ENV)) {
      return;
    }

    const minSecretLen = 32;
    if (data.JWT_ACCESS_SECRET.length < minSecretLen) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_ACCESS_SECRET'],
        message: `Must be at least ${minSecretLen} characters in ${data.NODE_ENV}`,
      });
    }
    if (data.JWT_REFRESH_SECRET.length < minSecretLen) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message: `Must be at least ${minSecretLen} characters in ${data.NODE_ENV}`,
      });
    }
    if (DEV_JWT_PLACEHOLDERS.has(data.JWT_ACCESS_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_ACCESS_SECRET'],
        message: 'Replace development JWT placeholder before deploying',
      });
    }
    if (DEV_JWT_PLACEHOLDERS.has(data.JWT_REFRESH_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message: 'Replace development JWT placeholder before deploying',
      });
    }
    if (!data.AWS_ACCESS_KEY_ID || !data.AWS_SECRET_ACCESS_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AWS_ACCESS_KEY_ID'],
        message: 'S3 credentials are required in staging/production (documents storage)',
      });
    }
    if (data.SEED_DEMO) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SEED_DEMO'],
        message: 'Demo seed must not be enabled in staging/production',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;

export function isProductionEnv(): boolean {
  return env.NODE_ENV === 'production';
}

export function isProdLikeEnv(): boolean {
  return isProdLike(env.NODE_ENV);
}

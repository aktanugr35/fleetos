# Haulyard — Railway (API)

## Build vs start

Railway build containers **do not** have `DATABASE_URL`. Do **not** run `prisma migrate deploy` in the build command.

| Phase | Command |
|-------|---------|
| **Build** | `pnpm install --frozen-lockfile` → shared-types build → `prisma generate` → API `tsc` |
| **Start** | `prisma migrate deploy` → `node dist/index.js` |

Repo root `railway.toml` configures this. If you set commands in the dashboard, match that split.

**Start command:** `sh scripts/railway/start-api.sh` or `pnpm start:api`

## Postgres

1. Railway project → **+ New** → **Database** → **PostgreSQL**
2. API service → **Variables** → **Add reference** → `DATABASE_URL` from Postgres service
3. Redeploy

## Required env (API service)

```env
NODE_ENV=production
DATABASE_URL=          # from Postgres plugin
REDIS_URL=             # Upstash
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
FRONTEND_URL=https://your-frontend.vercel.app
CROSS_SITE_COOKIES=true
AWS_ACCESS_KEY_ID=     # R2
AWS_SECRET_ACCESS_KEY=
AWS_REGION=auto
S3_BUCKET_NAME=
SEED_DEMO=false
```

## Monorepo

- **Root directory:** repo root (not `apps/api`)
- **packageManager:** `pnpm@9.15.0` in root `package.json`

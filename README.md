# FleetOS

Monorepo for a logistics / fleet TMS: **Express + Prisma** API (`apps/api`), **Next.js** dashboard (`apps/web`), and shared **`@fleetos/shared-types`** (enums, API shapes, currency helpers).

Detailed roadmap and acceptance checks live in [`walkthrough.md`](./walkthrough.md).

## Prerequisites

- **Node.js** ≥ 20  
- **pnpm** ≥ 9  
- **Docker** (PostgreSQL and Redis via `infrastructure/docker-compose.yml`)

## Environment

1. Copy the root example and adjust secrets (especially JWT values in production):

   ```bash
   cp .env.example .env
   ```

2. Configure the web app (browser → API base URL):

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

   `NEXT_PUBLIC_API_URL` must point at the API origin (no `/api/v1` suffix), e.g. `http://localhost:3001`.

The API loads environment variables from the **repository root** `.env` (see `apps/api/src/config/env.ts`).

## Database & services

```bash
pnpm docker:up              # Postgres + Redis
pnpm db:migrate:deploy        # apply committed migrations (fresh DB / production)
# dev: create a new migration after schema changes
pnpm db:migrate
```

Migrations live in `apps/api/prisma/migrations/`. Use **`db:migrate:deploy`** in CI and production; use **`db:migrate`** locally when you change `schema.prisma`.

**Upgrading from `db push` only:** if your database already has tables but no migration history:

```bash
pnpm --filter @fleetos/api exec prisma migrate resolve --applied 20260516120000_init
```

`db:push` remains available for quick experiments but is not the primary workflow.

## First-time system setup

When **no users** exist yet:

- Open **`http://localhost:3000/setup`** in the browser and complete the wizard, **or**
- Call **`POST /api/v1/setup`** on the API (see `apps/api/src/modules/setup`).

After the first user exists, setup is disabled (`403 SETUP_COMPLETE` on repeat `POST /setup`).

**Smoke test (empty database, no seed):**

```bash
pnpm docker:up
pnpm db:migrate:deploy
# Do not set SEED_DEMO — pnpm db:seed will no-op
pnpm dev
# Open http://localhost:3000 — you should land on /setup
# Complete the wizard, then use the dashboard at /dashboard
```

## Documents API

Staff can upload PDF/images (max 10MB) via `POST /api/v1/documents/upload` (`multipart/form-data`: `file`, `type`, optional entity ids).

- **Local storage** (default): files under `apps/api/uploads/documents/`, served at `/uploads/...`
- **S3**: set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `.env`

List: `GET /api/v1/documents` · Download: `GET /api/v1/documents/:id/download` (auth required)

## Demo seed (optional, development only)

```bash
# In .env set SEED_DEMO=true, then:
pnpm db:seed
```

Demo users and data are skipped unless `SEED_DEMO=true` (see `apps/api/prisma/seed.ts`). Use `SEED_VERBOSE=true` for per-entity seed logs. Sample settlement PDFs are generated under `docs/samples/` via `pnpm dev:sample-pdf` (not committed).

## Development

```bash
pnpm install
pnpm dev        # Turbo: API + web (default ports 3001 / 3000)
```

## Production build

```bash
pnpm build
```

## Production deploy (Vercel + Render, free tier)

Deploy frontend to **Vercel** and API to **Render** (no VPS). Step-by-step: [docs/DEPLOY-VERCEL-RENDER.md](docs/DEPLOY-VERCEL-RENDER.md).

Configs: `render.yaml`, `apps/web/vercel.json`.

## Production deploy (Docker Compose)

Full stack: Postgres, Redis, API, and Web.

```bash
cp infrastructure/.env.prod.example infrastructure/.env.prod
# Required: POSTGRES_PASSWORD, JWT_ACCESS_SECRET & JWT_REFRESH_SECRET (32+ chars each),
#            AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY (S3 or R2 for documents)
# Keep SEED_DEMO=false

pnpm docker:prod:up
```

- **Web:** `http://localhost:3000` — run first-time `/setup` (no demo seed in production).
- **API health:** `curl http://localhost:3001/health` (for load balancers).
- **Settlement PDFs** use local volume `api_uploads` inside the API container; **documents** require S3 in `staging` / `production`.

Optional **Sentry:** set `SENTRY_DSN` in `.env.prod` and `NEXT_PUBLIC_SENTRY_DSN` before building the web image (rebuild if you change the web DSN).

Stop the stack: `pnpm docker:prod:down`

### Database backups

Postgres data is stored in the Docker volume `postgres_data`. Example logical backup:

```bash
docker exec fleetos-prod-db pg_dump -U fleetos fleetos > "fleetos-$(date +%Y%m%d).sql"
```

Restore into a fresh database with `psql` or your host’s backup tooling.

## Scripts (root `package.json`)

| Script        | Purpose                          |
|---------------|----------------------------------|
| `pnpm dev`    | Run API + web in watch mode      |
| `pnpm build`  | Typecheck / build all packages   |
| `pnpm lint`   | Lint                             |
| `pnpm test`   | Unit tests (API + shared-types + web; 50+ cases) |
| `pnpm --filter @fleetos/api test:integration` | Supertest health/setup (needs Docker DB + `FLEETOS_INTEGRATION=1`) |
| `pnpm docker:up` / `pnpm docker:down` | Dev infra (Postgres + Redis) |
| `pnpm docker:prod:up` / `docker:prod:down` | Production Docker stack |
| `pnpm db:migrate:deploy` | Apply migrations (prod / fresh DB) |
| `pnpm db:migrate`        | Dev: create/apply migration        |
| `pnpm db:migrate:status` | Migration status                 |
| `pnpm db:push`           | Schema sync without migrations (escape hatch) |
| `pnpm db:seed`           | Demo seed (`SEED_DEMO=true` only) |
| `pnpm dev:sample-pdf`    | Dev PDF layout sample (needs demo seed) |
| `pnpm db:studio` | Prisma Studio                 |

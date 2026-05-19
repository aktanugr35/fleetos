# FleetOS — Vercel (Web) + Render (API) Deploy

Free-tier friendly setup. **No VPS.**

> Repo layout is a **pnpm monorepo**: `apps/web` (Next.js), `apps/api` (Express), not `/frontend` or `/backend`.

## Will it work?

| Feature | Vercel + Render |
|---------|-----------------|
| Login / dashboard / CRUD | Yes |
| Setup / Sign Up (first user) | Yes |
| Documents upload | Yes (needs **Cloudflare R2** or S3 env on Render) |
| Settlement **PDF** | Often **fails or OOM** on Render free (Puppeteer/Chrome). Use local Docker for PDF or upgrade Render plan. |
| Cold start | Render free spins down ~50s after idle |
| Redis | Required — use **Upstash** free (`REDIS_URL`) |

---

## 1. GitHub

```bash
cd fleetos
git init   # if needed
git remote add origin https://github.com/YOUR_USER/fleetos.git
git add .
git commit -m "chore: prepare Vercel + Render deploy"
git push -u origin main
```

Never commit `.env` — only `.env.example` files.

---

## 2. Upstash Redis (free)

1. [console.upstash.com](https://console.upstash.com) → Create database  
2. Copy **Redis URL** (`rediss://...`) for Render `REDIS_URL`

---

## 3. Cloudflare R2 (documents — required in production)

1. R2 → Create bucket → API token (S3 compatible)  
2. On Render set: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION=auto`, `S3_BUCKET_NAME`

---

## 4. Render — API + Postgres

### Option A: Blueprint (`render.yaml`)

1. Render Dashboard → **New** → **Blueprint**  
2. Connect GitHub repo  
3. After create, set **manual** env vars:
   - `FRONTEND_URL` = `https://YOUR-PROJECT.vercel.app` (after Vercel deploy)
   - `REDIS_URL` = Upstash URL
   - R2 / S3 keys

### Option B: Manual Web Service

| Setting | Value |
|---------|--------|
| Root Directory | *(leave empty — repo root)* |
| Build Command | See `render.yaml` `buildCommand` |
| Start Command | `pnpm --filter @fleetos/api start` |
| Health Check | `/health` |

**Environment variables (minimum):**

```env
NODE_ENV=production
CROSS_SITE_COOKIES=true
DATABASE_URL=          # from Render Postgres
REDIS_URL=             # Upstash
JWT_ACCESS_SECRET=     # openssl rand -base64 48
JWT_REFRESH_SECRET=    # openssl rand -base64 48
FRONTEND_URL=https://your-app.vercel.app
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=auto
S3_BUCKET_NAME=
SEED_DEMO=false
```

Deploy → note API URL: `https://fleetos-api.onrender.com`

Test: `curl https://fleetos-api.onrender.com/health`

---

## 5. Vercel — Web

1. [vercel.com](https://vercel.com) → **Add New Project** → Import GitHub repo  
2. **Root Directory:** `apps/web`  
3. Framework: Next.js (auto)  
4. `apps/web/vercel.json` already sets monorepo install/build  

**Environment variable:**

```env
NEXT_PUBLIC_API_URL=https://fleetos-api.onrender.com
```

Deploy → URL: `https://your-project.vercel.app`

---

## 6. Connect frontend ↔ backend

1. Render → set `FRONTEND_URL` = exact Vercel URL (no trailing slash)  
2. Render → `CROSS_SITE_COOKIES=true` (already in blueprint)  
3. Redeploy Render if you changed `FRONTEND_URL`  
4. Vercel → redeploy if you changed `NEXT_PUBLIC_API_URL`

Optional preview URLs:

```env
CORS_ORIGINS=https://your-project-git-main.vercel.app
```

---

## 7. First use

1. Open Vercel URL  
2. **Sign Up** → create company + admin (empty database)  
3. Do **not** set `SEED_DEMO=true` on Render  

---

## 8. Final checklist

- [ ] `GET https://YOUR-API.onrender.com/health` → `healthy`  
- [ ] Vercel home loads  
- [ ] Sign Up / Login works (no CORS in browser console)  
- [ ] Document upload works (R2 configured)  
- [ ] PDF generate (may fail on free Render — expected limitation)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS error | `FRONTEND_URL` must match Vercel URL exactly; redeploy API |
| Login then 401 on refresh | `CROSS_SITE_COOKIES=true` on Render |
| API crash on boot | Missing `REDIS_URL` or `DATABASE_URL` or S3 keys |
| Build fails Prisma | Ensure `prisma migrate deploy` in build; Postgres attached |
| Vercel build fails | Node 20; pnpm in `vercel.json` install command |

---

## Cost note

- Vercel hobby: free for personal  
- Render free: sleeps when idle  
- Upstash + R2: generous free tiers  

For production traffic or PDF at scale, use VPS/Docker or paid Render + larger instance.

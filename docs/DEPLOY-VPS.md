# Haulyard — VPS deploy (IONOS / Ubuntu)

**Recommended production path:** one Linux VPS, Docker Compose, Nginx on the host.

WordPress stays on IONOS web hosting. Haulyard uses a subdomain, e.g. `panel.valleytransusa.com`.

## Requirements

- Ubuntu 22.04 or 24.04 LTS
- **2 vCPU, 2 GB RAM, 80 GB** — OK for a small team; add **2 GB swap** (see below)
- Domain DNS: `panel` → VPS public IP (A record)

## 1. Server prep

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin git nginx certbot python3-certbot-nginx

sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 2. Clone and configure

```bash
git clone https://github.com/aktanugr35/haulyard.git
cd haulyard
cp infrastructure/.env.prod.example infrastructure/.env.prod
nano infrastructure/.env.prod
```

Set at minimum:

| Variable | Example (single domain) |
|----------|-------------------------|
| `POSTGRES_PASSWORD` | strong password |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | `openssl rand -base64 48` |
| `FRONTEND_URL` | `https://panel.valleytransusa.com` |
| `NEXT_PUBLIC_API_URL` | `https://panel.valleytransusa.com` (same host — Nginx proxies `/api`) |
| `CROSS_SITE_COOKIES` | `false` |
| `AWS_*` / `S3_BUCKET_NAME` | Cloudflare R2 or S3 (required in production for documents) |
| `SEED_DEMO` | `false` |

Rebuild web image after changing `NEXT_PUBLIC_API_URL`.

## 3. Start stack

```bash
docker compose -f infrastructure/docker-compose.prod.yml --env-file infrastructure/.env.prod up --build -d
```

Check:

```bash
curl -s http://127.0.0.1:3001/health
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000
```

## 4. Nginx + HTTPS

```bash
sudo cp infrastructure/nginx/haulyard.conf.example /etc/nginx/sites-available/haulyard
sudo nano /etc/nginx/sites-available/haulyard   # set server_name
sudo ln -sf /etc/nginx/sites-available/haulyard /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d panel.valleytransusa.com

# After certbot, confirm the body-size limit is on the HTTPS server too.
# Missing this is what makes driver application photo uploads return 413.
sudo nginx -T | grep client_max_body_size
# If empty, add `client_max_body_size 25M;` inside the `listen 443 ssl` server
# block in /etc/nginx/sites-available/haulyard, then: sudo nginx -t && sudo systemctl reload nginx
```

## 5. First use

Open `https://panel.valleytransusa.com` → **Sign Up** (first user when DB is empty).

## 6. Import portal passwords (Excel)

Upload your Excel file to the VPS (e.g. `/root/fleetos/valleysifreguncel.xlsx`), then from repo root:

```bash
cd /root/fleetos
git pull
sh scripts/vps/deploy.sh
sh scripts/vps/import-passwords.sh /root/fleetos/valleysifreguncel.xlsx
```

If you have multiple companies, list slugs first:

```bash
docker exec haulyard-prod-db psql -U fleetos -d fleetos -c 'SELECT slug, name FROM companies;'
sh scripts/vps/import-passwords.sh /root/fleetos/valleysifreguncel.xlsx --company-slug=YOUR-SLUG
```

Expected output: `Verified: 22 entries imported.`

Optional (recommended): set a dedicated vault key in `infrastructure/.env.prod`:

```bash
openssl rand -hex 32
# CREDENTIALS_ENCRYPTION_KEY=<output>
```

Then redeploy. If you import before setting this key, do **not** change the key later without re-importing.

## Updates

```bash
cd haulyard
git pull
docker compose -f infrastructure/docker-compose.prod.yml --env-file infrastructure/.env.prod up --build -d
```

## Backup

```bash
docker exec haulyard-prod-db pg_dump -U fleetos fleetos > "haulyard-$(date +%Y%m%d).sql"
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API exits on boot | Check `.env.prod` — JWT 32+ chars, S3 keys set. After Passwords deploy, set `CREDENTIALS_ENCRYPTION_KEY` (`openssl rand -hex 32`) before using that page |
| Login fails / 502 | API container down — `docker logs haulyard-prod-api`; often missing env or migration error |
| Login fails (API up) | `FRONTEND_URL` must match browser URL exactly; VPS uses `CROSS_SITE_COOKIES=false` |
| "No refresh token" on HTTP | Use `http://` in `FRONTEND_URL` (not https) until certbot; rebuild API after cookie fix |
| PDF slow / OOM | Normal on 2 GB; wait or add swap / upgrade RAM |
| 502 from Nginx | `docker ps`; containers must listen on `127.0.0.1:3000` and `:3001` |

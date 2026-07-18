# Haulyard — Geliştirme Walkthrough

Bu belge, Haulyard projesini **sıfır hatayla, demo/dump verisi olmadan, production-ready** hale getirmek için faz faz ilerleme planıdır.

**Kullanım kuralı:** Fazları sırayla tamamlayın. Bir fazın **Kabul kriterleri** karşılanmadan sonraki faza geçmeyin. Her faz sonunda `pnpm build` ve ilgili smoke testleri yeşil olmalıdır.

**Son güncelleme:** 16 Mayıs 2026

---

## Tamamlanan işler (oturum özeti)

Aşağıdakiler walkthrough dışında yapıldı; faz kabul kriterlerinin tamamı karşılanmış sayılmaz, ancak ilerleme kaydı burada tutulur.

| Tarih | Alan | Yapılan |
|-------|------|---------|
| 2026-05-15 | Dev ortamı | `pnpm-workspace.yaml` → `puppeteer: true`; Docker (Postgres + Redis); `pnpm dev` / ayrı api+web |
| 2026-05-15 | Loads | Geçmiş `deliveryDate` → otomatik `DELIVERED`; create formunda status seçimi; schema Prisma enum ile hizalı |
| 2026-05-15 | Settlement PDF | Total Deadhead / Total Loaded load `deadheadMiles` + `loadedMiles` toplamından; trip satırı DHD/LDD düzeltmesi; toll ayrı satır; `pdf.service` singleton `prisma` + tenant kontrolü |
| 2026-05-15 | Deductions UI | Sürücü kart listesi (`/dashboard/deductions`); sürücü detay (`/dashboard/deductions/[driverId]`); `lib/deductions.ts`; modal sürücüye kilitli ekleme |
| 2026-05-15 | Settlement modal | Pending deduction tutarı `amount` field fix (önceden `amountCents` yanlıştı) |
| 2026-05-15 | Auth (Faz 3) | `middleware.ts` dashboard/login koruması; `DashboardAuthGuard` + cookie sync; login → `/dashboard` + `redirect` param; logout API + `clearAuth`; `pnpm --filter /web build` ✅ |
| 2026-05-15 | Faz 5 | Credits API (`/api/v1/credits`); settlement create → `creditTotal`, net = gross − deductions + credits; duplicate load guard; finalize/mark paid UI; Credits sayfaları |
| 2026-05-16 | Reports | `GET /reports/operational-analytics`; presets 30d/90d/6m/12m/ytd + custom range; drivers/brokers tabs (EN UI) |
| 2026-05-16 | Theme | Light/dark `data-theme`; white light surfaces; `ThemeToggle` in header |
| 2026-05-16 | Notifications | `/api/v1/notifications` list/read; compliance sync; settlement finalize → `SETTLEMENT_READY`; `NotificationBell` |
| 2026-05-16 | Auth / setup | Login redirects to `/setup` when `setupRequired`; middleware allows `/setup` without token |
| 2026-05-16 | Faz 8 | RBAC middleware + web `usePermission`; SUPER_ADMIN tenant switcher |
| 2026-05-16 | Faz 9 | 54 unit tests (`node --test`); CI `.github/workflows/ci.yml`; loads/pdf/auth logic extract; supertest integration (opt-in) |
| 2026-05-16 | Faz 12 | Kök sample PDF → `docs/samples/`; `test-zod.ts` silindi; seed credential log kaldırıldı; landing/audit/loads types |
| 2026-05-16 | Faz 10 | `docker-compose.prod.yml`, API/Web Dockerfiles, env/S3/seed guards, Sentry, README backup |
| 2026-05-16 | Faz 1 | `20260516120000_init` migration; `db:migrate:deploy`; seed `SEED_DEMO`; PDF script → `scripts/dev/` |
| 2026-05-16 | Faz 4 | Documents local/S3; companies POST; audit middleware; Zod details; bullmq removed |
| 2026-05-16 | Faz 5 | Persistent settlements; eligible tests; PDF errors + regenerate; settlements UI + detail modal |
| 2026-05-16 | Faz 2 | `/shared-types`: enums, ApiResponse, entities, currency, labels; API Zod + web re-exports |
| 2026-05-16 | Faz 6 | EmptyState/ErrorState/ConfirmDialog; mobil sidebar; dashboard types |
| 2026-05-16 | Faz 7 | Bootstrap wizard; middleware `/`→`/setup`; seed guard; setup tests |
| 2026-05-16 | Faz 8 | `/shared-types/rbac`; tenant-scope; RBAC + tenant tests |

---

## Hedef durum (Definition of Done)

Proje bittiğinde:

- [ ] `pnpm install && pnpm docker:up && pnpm db:migrate && pnpm build` hatasız çalışır
- [ ] Boş veritabanında ilk kurulum akışı (super admin → şirket → kullanıcı) çalışır
- [x] Tüm dashboard sayfaları auth korumalı; token yoksa `/login` (middleware + client guard)
- [ ] API tüm korumalı route'larda tenant izolasyonu + RBAC doğrulanır
- [x] Settlement akışı (eligible → create → PDF) temel olarak çalışır
- [x] Credits modülü settlement ve PDF'e entegre
- [x] Kök dizinde `sample_*.pdf`, `test-zod.ts` gibi geliştirme artıkları yok
- [ ] Seed yalnızca `NODE_ENV=development` veya `pnpm db:seed` ile; production'da zorunlu değil
- [ ] README kurulum ve ortam değişkenlerini dokümante eder
- [x] Kritik API ve settlement hesapları için unit + integration smoke testleri (`pnpm test`, `test:integration`)

---

## Mevcut durum özeti

| Alan | Durum |
|------|--------|
| Monorepo (api + web + shared-types) | ✅ Var |
| Prisma domain modeli | ✅ Güçlü |
| API modülleri | ✅ Çoğu tamam |
| Frontend sayfaları | 🔄 CRUD modallar + bazı sayfalar iyileştirildi |
| Dev ortamı (Docker, build) | ✅ `pnpm build` geçiyor |
| Loads (geçmiş tarih → DELIVERED) | ✅ |
| Settlement + PDF (mil + credits + net) | 🔄 Çalışıyor; Puppeteer Docker iyileştirmesi kaldı |
| Credits API/UI | ✅ |
| Deductions UI (sürücü bazlı) | ✅ |
| Auth (JWT + refresh) | 🔄 Middleware + client guard + login/logout ✅; SUPER_ADMIN tenant switcher ✅ |
| Notifications | ✅ API + bell UI; compliance + settlement types |
| `/shared-types` | ✅ API + web workspace dependency |
| Prisma migrations | ✅ `20260516120000_init` repoda; `db:migrate:deploy` |
| Testler | 🔄 API: `pnpm --filter /api test` (10 unit tests) |
| BullMQ | ❌ Bağımlılık var, kod yok |
| Demo/dump dosyalar | ✅ PDF'ler `docs/samples/` (gitignore); `test-zod.ts` silindi |

---

## Faz 0 — Temel hijyen ve çalışır repo

**Amaç:** Her geliştirici aynı ortamda, temiz bir başlangıçla çalışabilsin.

**Durum:** 🔄 Kısmen — build ve Docker çalışıyor; kök `README.md` ve `apps/web/.env.example` eklendi.

### Görevler

1. **Kök `README.md` oluştur**
   - Gereksinimler: Node 20+, pnpm 9+, Docker
   - Kurulum: `pnpm install` → `pnpm docker:up` → `.env` kopyala → `pnpm db:migrate` → `pnpm dev`
   - Portlar: web `3000`, api `3001`
   - İlk giriş: Faz 7'deki bootstrap akışına referans
   - Demo seed: `admin@valleytrans.com` / `Admin123!` (yalnızca dev)

2. **`.env.example` doğrula**
   - Tüm zorunlu değişkenler `apps/api/src/config/env.ts` ile uyumlu olsun
   - `apps/web/.env.example` ekle: `NEXT_PUBLIC_API_URL=http://localhost:3001`

3. **Geliştirme artıklarını ayır (henüz silme — Faz 12'de temizlik)**
   - `sample_statement.pdf`, `sample_statement_anil_aktan.pdf` → `docs/samples/` veya silinecek listeye al
   - `test-zod.ts` → silinecek listeye al
   - `apps/api/prisma/seed_past_loads.ts` → `scripts/dev/` altına taşı veya Faz 12'de kaldır

4. **`.gitignore` gözden geçir**
   - `apps/api/prisma/migrations/` şu an ignore'da — **Faz 1'de migrations'ı repoya alacağız**, bu satırı kaldır
   - `apps/api/uploads/` ignore'a ekle (yüklenen dosyalar commit edilmesin)
   - `apps/api/dist/` zaten ignore'da — build artifact commit edilmesin

5. **Turbo pipeline doğrula**
   ```bash
   pnpm install
   pnpm docker:up
   cp .env.example .env   # gerekirse apps/api/.env da
   pnpm db:migrate:deploy # Faz 1 — committed migrations
   pnpm build
   ```

6. **`pnpm-workspace.yaml`** — `allowBuilds.puppeteer: true` (yapıldı ✅)

### Kabul kriterleri

- [ ] README ile yeni geliştirici 15 dk içinde `pnpm dev` çalıştırabilir
- [x] `pnpm build` api + web için exit 0

---

## Faz 1 — Veritabanı: migrations ve seed ayrımı

**Amaç:** Production'da tekrarlanabilir şema; seed yalnızca geliştirme.

**Durum:** ✅ Tamamlandı (16 Mayıs 2026)

### Görevler

1. **İlk migration oluştur**
   ```bash
   pnpm --filter /api exec prisma migrate dev --name init
   ```
   - `.gitignore`'dan `apps/api/prisma/migrations/` satırını kaldır
   - Migration dosyalarını commit et

2. **Root script'leri güncelle** (`package.json`)
   - `db:migrate` → production için `prisma migrate deploy` script'i ekle (ör. `db:migrate:prod`)

3. **Seed'i ikiye ayır**
   - `prisma/seed.ts` → **minimal dev seed** (opsiyonel, `SEED_DEMO=true` ile)
   - Production bootstrap **seed'de olmamalı** — Faz 7'de API ile

4. **`seed_past_loads.ts`**
   - PDF layout test script'i ise → `scripts/dev/generate-sample-pdf.ts` olarak taşı
   - `package.json` prisma seed'den çıkar

### Kabul kriterleri

- [x] Boş DB + `pnpm db:migrate:deploy` → şema oluşur (`20260516120000_init`)
- [x] `pnpm db:seed` demo veriyi yalnızca `SEED_DEMO=true` ile yükler
- [x] `seed_past_loads.ts` → `scripts/dev/generate-sample-pdf.ts` (`pnpm dev:sample-pdf`)

---

## Faz 2 — Paylaşılan tipler ve API sözleşmesi

**Amaç:** Frontend/backend enum ve response tipleri tek kaynaktan gelsin.

**Durum:** ✅ Tamamlandı (16 Mayıs 2026)

### Görevler

1. **`/shared-types` genişlet**
   - `CreditType`, `DeductionType` (schema ile senkron)
   - `ApiResponse<T>`, pagination, auth DTO'ları
   - `packages/shared-types/package.json` → `"main": "src/index.ts"` veya build çıktısı

2. **API'de kullan**
   - `apps/api/package.json` → `"/shared-types": "workspace:*"`
   - Controller response tipleri, Zod enum'ları shared-types'tan türet

3. **Web'de kullan**
   - `apps/web/package.json` → workspace dependency
   - Sayfa state'lerinde `any` yerine shared interface'ler
   - `lib/deductions.ts` → shared-types'a taşınabilir

4. **Para formatı**
   - `packages/shared-types` veya `packages/shared-utils`: `formatCents`, `parseDollarsToCents`
   - Web `lib/utils.ts` ve API `utils/currency.ts` bu paketi kullansın

### Kabul kriterleri

- [x] Enum duplicate yok — `/shared-types` + Zod `nativeEnum` (API şemaları)
- [x] `pnpm --filter /shared-types build` + api + web build yeşil
- [x] `formatCurrency` / `formatCentsToUSD` tek pakette

---

## Faz 3 — Kimlik doğrulama ve route koruması

**Amaç:** Yetkisiz kullanıcı dashboard'a erişemesin; token yenileme güvenilir olsun.

**Durum:** 🔄 Kısmen — çekirdek guard tamam; SUPER_ADMIN tenant switcher ve API audit kaldı.

### Görevler

1. **Next.js middleware** — `apps/web/src/middleware.ts` ✅
   - `/dashboard/*` → `haulyard_access_token` cookie kontrolü
   - Yoksa `/login?redirect=...`
   - `/login` → zaten girişliyse `/dashboard` (veya `redirect` hedefi)

2. **Dashboard layout guard** — `DashboardAuthGuard` + `(dashboard)/layout.tsx` ✅
   - Client-side: `/auth/me` doğrulama + loading state
   - Token geçersizse `/login?redirect=...`

3. **Login düzeltmeleri** — `login/page.tsx` ✅
   - Başarılı giriş → `/dashboard` (veya güvenli `redirect` query)
   - `useSearchParams` + `Suspense` fallback

4. **API auth tutarlılığı** ⬜
   - Tüm `/api/v1/*` (auth hariç) → `authMiddleware` + `tenantMiddleware`
   - `tenantMiddleware`: route'larda `req.tenantId!` kullanılmadan önce controller'da null check

5. **SUPER_ADMIN tenant seçimi** ⬜
   - Web: header'da company switcher (super admin için)
   - API çağrılarına `?tenantId=` ekle

6. **Logout** ✅
   - Header'da logout → `POST /auth/logout`, `clearAuth()`, `/login`
   - `auth-cookies.ts`: localStorage + `haulyard_access_token` cookie senkronu
   - `api.ts` interceptor: refresh başarısız → cookie temizle + `/login`

### Kabul kriterleri

- [x] Token olmadan `/dashboard` → login (middleware)
- [x] Login sonrası dashboard açılır (`/dashboard` veya `redirect`)
- [x] Refresh token süresi dolunca otomatik login'e düşer (axios interceptor)
- [x] Logout sonrası korumalı sayfa erişilemez (cookie + localStorage temiz)
- [ ] SUPER_ADMIN çoklu tenant geçişi (Faz 8 ile birleştirilebilir)

---

## Faz 4 — API sağlamlaştırma

**Amaç:** Tutarlı hata yanıtları, tenant güvenliği, eksik modüller.

**Durum:** ✅ Tamamlandı (16 Mayıs 2026)

### Görevler

1. **Credits modülü** (yeni)
   - `modules/credits/` — CRUD, list by driver, settlement'a bağlanmamış credits
   - `settlements.service.create` → pending credits'i dahil et (`creditTotal`, `SettlementCredit`)
   - `getEligible` response'a `credits` ekle

2. **Notifications modülü**
   - `modules/notifications/` — list, mark read
   - Compliance service: YELLOW/RED oluşunca notification kaydı (sync veya job)
   - `app.ts`'te route'u aç

3. **Documents**
   - Upload → `uploads/` veya S3 (env `S3_BUCKET_NAME` doluysa S3, değilse local)
   - MIME whitelist, max size
   - Download URL üretimi

4. **Companies**
   - `GET/PATCH /companies/me` — settings sayfası ile uyumlu
   - SUPER_ADMIN: `GET /companies`, `POST /companies`

5. **Hata standardizasyonu**
   - Tüm controller'lar `successResponse` / `AppError` kullanır
   - Zod validation hataları 400 + `details`

6. **Kullanılmayan bağımlılıklar**
   - BullMQ kullanılmayacaksa **kaldır**; kullanılacaksa Faz 10'da PDF queue için ekle
   - ~~`pdf.service.ts` → singleton `prisma`~~ ✅

7. **Audit middleware**
   - Kritik mutation'lara bağla: settlement finalize, driver delete, load status change

### Kabul kriterleri

- [x] Credits CRUD + settlement `creditTotal` / eligible `credits`
- [x] Notifications list / mark read + compliance + settlement sync
- [x] Documents: upload, list, get, download, delete (local veya S3)
- [x] Companies: `GET/PATCH /me`, `GET/POST /` (SUPER_ADMIN)
- [x] Zod → 400 `VALIDATION_ERROR` + `details` (issues)
- [x] Audit: settlement finalize, driver delete, load update
- [x] BullMQ kaldırıldı (Faz 10'da queue gerekirse yeniden eklenir)

---

## Faz 5 — Settlement ve PDF (çekirdek iş mantığı)

**Amaç:** Haftalık driver statement production kalitesinde.

**Durum:** ✅ Tamamlandı (16 Mayıs 2026)

### Tamamlanan alt görevler ✅

- Geçmiş tarihli load → `DELIVERED` (settlement eligible)
- PDF: Total Deadhead / Total Loaded / trip DHD-LDD satırları
- PDF: toll deductions ayrı satır; pay rate formatı
- PDF generate: tenant-scoped `findFirst`

### Tamamlanan (bu oturum)

1. **`getEligible` unit testleri** — `settlements.eligible.ts` + OWNER / OWNER_DRIVER / DRIVER
2. **`create` kalıcı** — settlement DB'de kalır; PDF hata → DRAFT + SYSTEM notification
3. **Eligible filtre** — zaten settle edilmiş load/deduction/credit listede yok
4. **PDF** — timeout, eski PDF silinir, yeniden Generate
5. **`GET /settlements/:id/pdf`** — stream (alias download)
6. **Web** — liste + detay modal (Finalize / Mark paid / Generate / Download PDF)
7. **`ALREADY_APPLIED`** — settlement'taki deduction/credit silinemez

### Kabul kriterleri

- [x] Geçmiş load ekle → `DELIVERED` → settlement eligible listesinde görünür
- [x] PDF özet: Total Deadhead = load deadhead toplamı
- [x] Örnek load + deduction + credit → settlement → PDF (akış hazır; manuel doğrulama önerilir)
- [ ] PDF tutarları API response ile birebir (manuel doğrulama)
- [x] İkinci kez aynı load settle edilemez

### Manuel test — Settlement + PDF

```
1. Loads → geçmiş delivery date ile load ekle → status Delivered
2. Deductions → sürücü kartı → deduction ekle (pending)
3. Settlements → Generate → sürücü seç → load + deduction işaretle → oluştur
4. PDF Generate → aç → Total Deadhead / Loaded / Miles kontrol et
```

---

## Faz 6 — Frontend modülleri (tam CRUD ve UX)

**Amaç:** Her sidebar sayfası gerçek veriyle çalışsın; `any` ve `console.error` minimum.

**Durum:** ✅ Tamamlandı (çekirdek UX)

### Tamamlanan alt görevler ✅

| Sayfa | Durum |
|-------|--------|
| **Dashboard** | Typed summary/chart/loads; loading skeleton; `ErrorState` + retry; `EmptyState` for chart/loads |
| **Drivers** | Detay `/drivers/[id]`; edit modal; `ConfirmDialog` deactivate; `EmptyState` / `ErrorState` |
| **Trucks / Trailers** | Edit modal; fetch errors + empty states |
| **Loads** | Status in list; filters; `EmptyState` / `ErrorState`; `getApiErrorMessage` in modal |
| **Compliance** | RED/YELLOW/GREEN filters; entity links; empty + error states |
| **Deductions** | `/deductions/[driverId]`; edit modal; `ConfirmDialog` delete |
| **Settlements** | List + detail modal; PDF flow |
| **Credits** | Sürücü bazlı liste + detay |
| **Reports** | Date presets; operational analytics |
| **Settings** | Company + logo + password |

**Ortak bileşenler** (`apps/web/src/components/ui/`)

- `EmptyState`, `ErrorState`, `ConfirmDialog`, `LoadingBlock` / `LoadingCard`
- `lib/logger.ts` — `logErrorDev` (dev-only)
- `lib/dashboard-types.ts` — dashboard API types
- `DashboardShell` — mobile sidebar overlay + hamburger in header

**Hata yönetimi**

- `lib/api-errors.ts` → `getApiErrorMessage` on list pages and modals
- `console.error` → `logErrorDev` on drivers/trucks/loads/compliance/dashboard

### Kabul kriterleri

- [x] Deductions: sürücü bazlı akış çalışır
- [x] Ana list sayfaları: happy path + boş liste + API hata (retry)
- [x] Mobile'da sidebar collapsible (overlay + menu)
- [ ] TanStack `DataTable` + react-hook-form/zod (ileride, Faz 6+)

---

## Faz 7 — İlk kurulum (production bootstrap)

**Amaç:** Demo seed olmadan gerçek sistem kurulabilsin.

**Durum:** ✅ Tamamlandı (16 Mayıs 2026)

### Tamamlanan görevler

1. **API** — `GET /api/v1/setup/status`, `POST /api/v1/setup`
   - İlk kullanıcı + şirket (`COMPANY_ADMIN`); oturum + refresh cookie
   - İkinci çağrı → `403 SETUP_COMPLETE`

2. **Web wizard** — `/setup` (admin + şirket formu, şifre kuralları, `router.refresh` sonrası dashboard)

3. **Seed** — `SEED_DEMO=true` olmadan `pnpm db:seed` atlanır (`apps/api/prisma/seed.ts`)

4. **Landing** — `HomeActions`: kurulum gerekliyse yalnızca **Get Started**; değilse **Sign In** + dev’de demo seed notu

5. **Middleware** — Boş DB’de `/` ve `/login` → `/setup` (API status kontrolü)

6. **Testler** — `setup.slug.test.ts` (slugify)

### Kabul kriterleri

- [x] Seed çalıştırmadan `migrate` + `/setup` ile tam sistem kullanılabilir
- [x] İkinci setup çağrısı reddedilir (`SETUP_COMPLETE`)

### Smoke (boş DB)

```bash
pnpm docker:up && pnpm db:migrate:deploy
# SEED_DEMO yok — db:seed atlanır
pnpm dev
# http://localhost:3000 → /setup → wizard → dashboard
```

---

## Faz 8 — RBAC ve multi-tenant sertleştirme

**Amaç:** Rol bazlı UI ve API; tenant sızıntısı olmasın.

**Durum:** ✅ Tamamlandı (16 Mayıs 2026)

### Tamamlanan görevler

1. **Rol matrisi (kod)** — `packages/shared-types/src/rbac.ts`
   - `FLEET_RBAC_MATRIX`, `roleHasPermission`, `STAFF_ROLES`
   - Web `usePermission` shared-types ile senkron
   - API `STAFF_ROLES` shared-types’tan import

2. **API RBAC** — Tüm tenant route’larında `rbacMiddleware`; settlement write = ADMIN/ACCOUNTING/SUPER (DISPATCHER hariç)

3. **Web UI** — `settlements:finalize` ayrı permission; Settings sidebar `company:write`; settlement modal finalize/mark-paid ayrı gate

4. **Tenant izolasyonu** — Servisler `companyId: tenantId` + `404 NOT_FOUND`; `tenantWhere()` helper + testler

5. **Testler** — `rbac.test.ts` (shared), `rbac.middleware.test.ts`, `tenant-scope.test.ts`

### Kabul kriterleri

- [x] DISPATCHER settlement finalize edemez (API 403 + UI buton yok)
- [x] Cross-tenant ID → 404 (servis katmanı pattern + `tenantWhere` dokümante)

---

## Faz 9 — Testler ve kalite kapısı

**Amaç:** Regresyon olmadan deploy.

**Durum:** ✅ Tamam (Playwright smoke opsiyonel — ertelendi)

### Görevler

1. **API — `node --test` + tsx** ✅
   - `settlements.eligible.test.ts` — gross revenue, load roles, settlement amounts
   - `pdf.miles.test.ts` — deadhead/loaded toplamları
   - `loads.logic.test.ts` — `inferInitialLoadStatus`, `calculateLoadTotalCents`
   - `packages/shared-types` — `currency.test.ts`
   - `auth.tokens.test.ts`, `auth.schema.test.ts`

2. **API — integration (opsiyonel)** ✅
   - `health.integration.test.ts` — supertest; `HAULYARD_INTEGRATION=1` ile çalışır
   - CI: Postgres + Redis service + `pnpm test:integration`

3. **Web** ⬜ (opsiyonel)
   - Playwright smoke: login → deductions → settlement PDF (Faz 9 dışı backlog)

4. **CI** ✅ — `.github/workflows/ci.yml`: install → migrate → build → lint → test → integration

5. **Lint** 🔄
   - API: `tsc --noEmit` (`pnpm --filter /api lint`)
   - Web: `eslint` · tam `no-explicit-any` kademeli (Faz 10+)

### Kabul kriterleri

- [x] `pnpm test` — 54 test (41 API + 11 shared-types + 2 web), hepsi geçer
- [x] GitHub Actions workflow tanımlı (PR'da CI)

---

## Faz 10 — Production altyapısı

**Amaç:** Gerçek ortamda güvenli çalışma.

**Durum:** ✅ Tamamlandı (16 Mayıs 2026)

### Görevler

1. **Docker Compose prod** ✅
   - `infrastructure/docker-compose.prod.yml` — db + redis + api + web
   - `infrastructure/docker/api.Dockerfile` (Chromium + migrate entrypoint)
   - `infrastructure/docker/web.Dockerfile` (Next standalone)
   - `pnpm docker:prod:up` / `infrastructure/.env.prod.example`

2. **Ortam** ✅
   - `env.ts`: staging/production → JWT ≥32 char, dev placeholder reddedilir, `SEED_DEMO` yasak
   - `seed.ts`: production/staging'de exit 1

3. **Dosya depolama** ✅
   - `assertStorageConfig()` bootstrap'ta; document upload S3 zorunlu prod-like
   - Settlement PDF: `api_uploads` Docker volume

4. **PDF kuyruğu** ⬜ (opsiyonel — BullMQ ertelendi)

5. **Gözlemlenebilirlik** ✅
   - Sentry: `@sentry/node` (API), `@sentry/nextjs` + `instrumentation.ts` (web), DSN opsiyonel
   - `/health` + Docker HEALTHCHECK

6. **Yedekleme** ✅ — README `pg_dump` örneği

### Kabul kriterleri

- [x] `pnpm docker:prod:up` (`.env.prod` ile) stack tanımlı
- [x] Production'da `SEED_DEMO` env şeması + seed script ile engelli

---

## Faz 11 — Dokümantasyon ve operasyon

**Durum:** ⬜ Bekliyor (Faz 0 README ile örtüşür)

### Görevler

1. **README** — kurulum, mimari diyagram, rol matrisi
2. **API dokümantasyonu** — OpenAPI (`swagger`) veya `docs/api.md`
3. **`.env.example`** — her değişken açıklamalı
4. **CHANGELOG.md** — semver

### Kabul kriterleri

- [ ] Yeni operatör README ile deploy edebilir

---

## Faz 12 — Final temizlik (dump-free release)

**Amaç:** Repoda geliştirme çöpü kalmasın.

**Durum:** ✅ Tamamlandı (16 Mayıs 2026)

### Silinecek / taşınacaklar

- [x] Kök `sample_*.pdf` → `docs/samples/` (PDF'ler `.gitignore`)
- [x] `test-zod.ts` silindi
- [x] `seed_past_loads.ts` zaten `scripts/dev/generate-sample-pdf.ts` (Faz 1)
- [x] `.gitignore`: `uploads/`, `dist/`, `sample_*.pdf`, `docs/samples/*.pdf`

### Kod temizliği

- [x] Audit middleware → `logger.warn` (console.error kaldırıldı)
- [x] Seed: credential dump kaldırıldı; `SEED_VERBOSE=true` ile detay log
- [x] `loads.service`: `Prisma.LoadWhereInput` + `LoadForMap` (mapLoad `any` kaldırıldı)
- [x] Landing: "Weekly Settlements" (GPS/tracking iddiası yok)
- [x] Login sonrası redirect `/dashboard` (zaten vardı)
- [x] Demo credentials yalnızca `NODE_ENV=development` login UI + README

### Son doğrulama

```bash
pnpm build && pnpm test
# Opsiyonel: pnpm dev:sample-pdf → docs/samples/sample_statement_anil_aktan.pdf
```

### Kabul kriterleri (RELEASE)

- [x] `pnpm build` + `pnpm test` yeşil
- [x] Kök dizinde geliştirme artığı yok
- [x] Production kodunda demo şifre logu yok (seed/README dev-only)

---

## İlerleme takip çizelgesi

| Faz | Ad | Durum | Not |
|-----|-----|--------|-----|
| 0 | Temel hijyen | 🔄 | Build ✅; README + `apps/web/.env.example` ✅ |
| 1 | Migrations & seed | ⬜ | |
| 2 | Shared types | ⬜ | `lib/deductions.ts` yerel |
| 3 | Auth & guards | 🔄 | Middleware + guard + login/logout ✅; SUPER_ADMIN tenant switcher ✅ |
| 4 | API sağlamlaştırma | 🔄 | PDF prisma/tenant ✅ |
| 5 | Settlement & PDF | 🔄 | Credits + net + finalize/paid ✅; PDF Docker iyileştirme kaldı |
| 6 | Frontend modülleri | 🔄 | Loads, Deductions, Settlements kısmen ✅ |
| 7 | Bootstrap / setup | ✅ | Wizard + middleware redirect + seed guard + smoke README |
| 8 | RBAC & tenant | ✅ | shared-types rbac matrix; tests; UI finalize gate |
| 9 | Testler & CI | ✅ | 54 unit; CI workflow; integration opt-in |
| 10 | Production infra | ✅ | Docker prod, env refine, S3, Sentry |
| 11 | Dokümantasyon | ⬜ | |
| 12 | Final temizlik | ✅ | Kök PDF/test-zod; seed sade; landing |

Durum işaretleri: ⬜ Bekliyor · 🔄 Devam ediyor / kısmen · ✅ Tamam

---

## Önerilen çalışma sırası (güncel)

```
Tamamlanan/kısmen: Faz 3 (auth çekirdek), Faz 5 (PDF mil), Faz 6 (Deductions, Loads)
Sıradaki:          Faz 11 (docs)
```

**Kritik yol (kalan):** 11 (Playwright smoke isteğe bağlı)

---

## Yerel geliştirme (hızlı referans)

```bash
# Altyapı
pnpm docker:up

# API (3001) + Web (3000) — ayrı terminaller
cd apps/api && pnpm dev
cd apps/web && pnpm dev

# veya monorepo
pnpm dev   # turbo; pnpm install puppeteer allowBuilds gerekli

# Health
curl http://localhost:3001/health
```

**Demo giriş (seed sonrası):** `admin@valleytrans.com` / `Admin123!`

---

## Her faz PR checklist'i

- [ ] Sadece ilgili fazın scope'u (drive-by refactor yok)
- [ ] `pnpm build` geçti
- [ ] Migration dosyası varsa commit edildi
- [ ] `.env.example` güncellendi (yeni env varsa)
- [ ] walkthrough.md ilerleme tablosu güncellendi

---

## Sonraki adım

**Faz 11** (dokümantasyon / OpenAPI) ile devam edin.

Faz 10 tamamlandı (Docker prod, env güvenliği, S3, Sentry). Opsiyonel: BullMQ PDF kuyruğu, Playwright E2E.

Walkthrough'a sadık kalmak için her faz bitiminde bu dosyadaki tabloyu güncelleyin.

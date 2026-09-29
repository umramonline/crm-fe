# Operasyon ve Deploy

## Process modeli

- Derlenmiş statik SPA (`dist/`)
- Node process production’da zorunlu değil (`preview` yalnızca local)
- Worker / queue yok
- API bu repo’da çalışmaz; ayrı `crm-be` process

## Startup checklist (dev)

1. `.env` → `VITE_API_BASE_URL` backend ile aynı mı?
2. Backend ayakta mı? CORS origin `http://localhost:5173` (veya gerçek FE origin) + credentials?
3. Cookie `Secure` local HTTP’de `false` olmalı (backend `AUTH_COOKIE_SECURE`)
4. `npm install` + `npm run dev`

## Build

```bash
npm run build
```

`tsc -b && vite build` → `dist/` (gitignore).

```bash
npm run preview
```

Production bundle’ı Vite preview ile servis eder; API URL hâlâ build-time `VITE_*`.

## GitHub Actions

| Workflow | Tetikleyici | Amaç |
|----------|-------------|------|
| `ci.yml` | push (main, test, develop), PR | `npm test -- --run`, `npm run build` (placeholder API URL) |
| `build-frontend.yml` | `workflow_call` | Ortama göre `VITE_API_BASE_URL` ile build + `dist/` artifact |
| `deploy-test.yml` | push → `test` | CI + build → rsync `dist/` |
| `deploy-production.yml` | push → `main` | Aynı, production ortamı |

### GitHub Environment ayarları

**Variables:**

| Variable | Açıklama |
|----------|----------|
| `VITE_API_BASE_URL` | Build-time API origin (`.env.staging` ile aynı mantık) |
| `FE_DEPLOY_DIR` | Sunucuda rsync hedefi (nginx root, trailing slash olmadan dizin) |
| `HEALTH_CHECK_URL` | SPA kök URL (deploy sonrası curl) |

**Secrets:** `TEST_SSH_*` / `PROD_SSH_*` (backend ile aynı isimler; host aynı olabilir).

## Deploy (manuel özet)

Tipik hedef:

1. CI veya makinede `VITE_API_BASE_URL` production API origin
2. `npm run build`
3. `dist/` içeriğini static host (nginx, CDN, object storage + HTTPS)
4. SPA fallback: bilinmeyen path → `index.html` (`/customers` deep link için zorunlu)
5. Backend CORS whitelist production FE origin; `AUTH_COOKIE_SECURE=true`; SameSite FE/API aynı site veya uygun proxy

> **Not:** API başka origin’deyse cookie için CORS credentials + doğru `SameSite` / domain gerekir. Farklı eTLD+1’de Lax cookie login’i bozabilir; reverse proxy ile aynı origin tercih edilir.

## Env per environment

| Ortam | `VITE_API_BASE_URL` örneği |
|-------|----------------------------|
| Local | Backend’in gerçek portu (`8080` veya `8321`) |
| Test / prod | `https://api.example.com` (örnek) |

Build sonrası URL değiştirmek için yeniden build.

## Loglama / monitoring

- Tarayıcı console; structured FE logging yok
- Global overlay hata ayırt etmez (tüm istekler)
- React Query retry: 1 (dashboard)

Öneriler (henüz yok): error boundary, request id, sourcemap politikası, uptime (static host).

## Test / lint CI

CI: `npm test -- --run` ve `npm run build`. Lint/format workflow’a dahil değil (config yoksa script fail eder). Local:

```bash
npm test -- --run
npm run build
```

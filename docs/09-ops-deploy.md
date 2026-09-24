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

## Deploy

Bu repoda Docker, nginx conf, GitHub Actions **yok**. Backend `deploy.yml` yalnızca API içindir.

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

Repo’da workflow yok. Local:

```bash
npm test
npm run lint
npm run format
```

ESLint/Prettier config dosyası yoksa script fail edebilir.

# Başlangıç

## Gereksinimler

- Node.js (Vite 8 / npm script’leri çalıştıracak sürüm)
- npm
- Çalışan CRM backend (cookie + CORS)
- Backend `CORS_ALLOWED_ORIGINS` içinde Vite origin (varsayılan: `http://localhost:5173`)

## Kurulum

```bash
git clone <repo-url>
cd crm-fe
cp .env.example .env
# VITE_API_BASE_URL değerini backend adresiyle eşleştirin
npm install
```

## Uygulamayı çalıştırma

```bash
npm run dev
```

Varsayılan adres: `http://localhost:5173`

Diğer script’ler:

| Script | Açıklama |
|--------|----------|
| `npm run build` | `tsc -b && vite build` → `dist/` |
| `npm run preview` | Production build’i yerelde servis et |
| `npm test` | Vitest (`vitest.config.ts`, jsdom) |
| `npm run lint` | `eslint .` |
| `npm run format` | `prettier --check .` |

## Startup sırası

Tarayıcı `index.html` yükler; `src/main.tsx`:

1. `global.css` import
2. `QueryClient` (`refetchOnWindowFocus: false`, `retry: 1`)
3. `<App />` mount

`App` açılışında:

1. `GET /api/v1/auth/session`
2. 401/hata ise `POST /api/v1/auth/refresh`
3. Session yoksa `/` (login)
4. Session varsa ve path `/` ise `/home`
5. Path + `*.menu` permission ile sayfa seçilir

## Test

```bash
npm test
```

Mevcut testler:

- `src/features/auth/hooks/useLoginFlow.test.tsx`
- `src/features/dashboard/hooks/useDashboardPage.test.tsx`
- `src/features/dashboard/utils/dateRangePresets.test.ts`

## Tipik geliştirme akışı

1. Backend’i ayağa kaldırın (CORS’ta `http://localhost:5173`, credentials açık)
2. `.env` içinde `VITE_API_BASE_URL` backend ile aynı olsun
3. `npm run dev`
4. Login: telefon → OTP → şifre
5. Cookie set olduktan sonra menü permission’lara göre dolar

> **Not:** Kod default API adresi `http://localhost:8321` (`apiClient.ts`). `.env.example` `http://localhost:8080` kullanır. Backend port’u hangisiyse `.env` onu yazmalıdır; aksi halde istekler yanlış origin’e gider.

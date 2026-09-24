# Genel Bakış

## Amaç

Bu proje, Umran CRM uygulamasının frontend SPA’sidir. Kullanıcıya Türkçe yönetim paneli sunar; kimlik doğrulama ve tüm iş verisi **CRM backend** REST API’si üzerinden gelir. Umramonline’a doğrudan HTTP atılmaz.

npm package adı: `frontend` (`package.json`).

## Teknoloji yığını

| Alan | Teknoloji | Not |
|------|-----------|-----|
| Dil | TypeScript 6 | `strict: true` |
| UI | React 19 + @adminlte/react 0.6 | AdminLTE 4 shell; CRM-specific CSS override |
| Bundler / dev | Vite 8 | `@vitejs/plugin-react` |
| HTTP | Axios 1.x | Cookie session, interceptor |
| Server state | TanStack React Query 5 | Yalnız dashboard |
| Validasyon | Zod 4 | Auth + dashboard filtreleri |
| Test | Vitest 4 + Testing Library + jsdom | |
| Lint / format | ESLint 10 / Prettier 3 | Script var; config dosyası yok |
| Routing | Manuel | `window.history` — React Router yok |

## Entry / çıktı

| Parça | Path | Açıklama |
|-------|------|----------|
| HTML | `index.html` | `lang=tr`, `#root` |
| Bootstrap | `src/main.tsx` | React + QueryClient |
| App shell | `src/app/App.tsx` | Session, routing, sayfa seçimi |
| Build çıktısı | `dist/` | `npm run build` — gitignore |

## Mimari özeti (tek cümle)

Vite + React SPA; feature-sliced klasörler; cookie tabanlı oturum; permission-gated manuel routing; Axios client ile CRM backend.

## Ne yapar / ne yapmaz

### Yapar

- OTP / password login (backend üzerinden Umramonline)
- Cookie session + rol/permission bazlı menü ve aksiyon
- Müşteri listeleme, arama, oluşturma, tam kayıt
- Görev listeleme, iptal, müşteri detayından görev atama
- Follow-up listeleme / güncelleme; görevden veya standalone oluşturma
- IETTS listesi ve müşteriye dönüştürme
- Dashboard KPI’ları (tarih aralığı)
- Yetki matrisi yönetimi (`/permissions`)

### Yapmaz

- Umramonline’a doğrudan bağlanmaz
- Consume webhook UI’si yoktur (`POST /api/v1/consume` backend-only)
- React Router / Next.js kullanmaz
- Token’ı `localStorage` / `sessionStorage`’a yazmaz
- MUI / Ant / Tailwind kullanmaz (`@adminlte/react` + Bootstrap 5 kullanır)
- GraphQL kullanmaz
- Docker / CI workflow bu repoda yoktur
- OpenAPI client üretmez; her feature kendi `*Api.ts` normalizasyonunu yazar

## SPA / state durumu

| Soru | Cevap |
|------|-------|
| SPA mı? | **Evet** — tek `index.html`, client-side path |
| Global store? | **Hayır** — session `App.tsx` state; sayfalar `useState` |
| React Query? | **Kısmen** — yalnızca dashboard + branch listesi |
| Shared DTO katmanı? | **Hayır** — tipler feature `*Api.ts` içinde |

## İlişkili sistemler

```
Tarayıcı (bu repo)
  │  cookie session (withCredentials)
  ▼
CRM Backend ──► MySQL (CRM)
      │
      └── HTTP ──► Umramonline API
```

Frontend yalnızca CRM Backend ile konuşur. Detay: [07-umramonline-integration.md](./07-umramonline-integration.md).

## AdminLTE migration

UI AdminLTE 4 + `@adminlte/react` ile migrate edildi (tamamlandı). Shell, CSS, topbar kuralları ve agent notları: [11-adminlte-migration.md](./11-adminlte-migration.md).

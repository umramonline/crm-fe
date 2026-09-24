# CRM Frontend Dokümantasyonu

Umran CRM frontend SPA’sinin teknik dokümantasyonu.

## İçindekiler

| Bölüm | Dosya | Açıklama |
|-------|-------|----------|
| Genel bakış | [00-overview.md](./00-overview.md) | Proje amacı, teknoloji yığını, sınırlar |
| Mimari | [01-architecture.md](./01-architecture.md) | Feature klasörleri, routing, API katmanı |
| Başlangıç | [02-getting-started.md](./02-getting-started.md) | Kurulum, çalıştırma, test |
| Konfigürasyon | [03-configuration.md](./03-configuration.md) | Ortam değişkenleri ve Vite |
| Auth & RBAC | [04-auth-and-rbac.md](./04-auth-and-rbac.md) | Login, cookie session, permission guard |
| Modüller | [05-modules/](./05-modules/) | Customer, task, follow-up, ietts, dashboard, authorization |
| Veri modeli | [06-data-model.md](./06-data-model.md) | TypeScript tipleri ve form modelleri |
| Umramonline | [07-umramonline-integration.md](./07-umramonline-integration.md) | FE’nin UO verisine BE üzerinden erişimi |
| API referansı | [08-api-reference.md](./08-api-reference.md) | Sayfalar, servisler, çağrılan endpoint’ler |
| Ops & deploy | [09-ops-deploy.md](./09-ops-deploy.md) | Build, static hosting, env |
| Güvenlik | [10-security.md](./10-security.md) | Cookie, XSS, UI-only permission |
| AdminLTE | [11-adminlte-migration.md](./11-adminlte-migration.md) | Tamamlanan UI migration, shell kuralları |

## Agent / Cursor standartları

- Clean Architecture (tüm repo): `../../.cursor/rules/clean-architecture.mdc`
- AdminLTE UI: `../.cursor/rules/adminlte-react.mdc`

## Hızlı özet

- **Dil:** TypeScript + React 19
- **Build:** Vite 8
- **HTTP:** Axios (`withCredentials: true`)
- **Entry point:** `src/main.tsx` → `src/app/App.tsx`
- **Routing:** React Router yok — `history.pushState` + `pathname`
- **Auth:** Cookie tabanlı session (HttpOnly; token localStorage’da yok)
- **Yetki:** Session `permissions[].name` ile menü ve aksiyon gizleme
- **API prefix:** `/api/v1` (CRM backend)

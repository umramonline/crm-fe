# Güvenlik

## Kimlik ve oturum

| Konu | Durum | Öneri |
|------|-------|-------|
| Token saklama | Yok — HttpOnly cookie | `localStorage`’a token yazılmamalı (şu an yazılmıyor) |
| Axios | `withCredentials: true` | CSRF: SameSite Lax + cookie; custom header yok |
| Refresh | 401 interceptor | Auth URL’leri hariç; dedupe var |
| Logout | `POST /logout` + local `session=null` | Server-side blacklist yok (BE) |
| OTP verify | Session açmaz | Login yalnızca password adımı |
| `rememberMe` | UI var, etkisi yok | Kullanıcıya vaat etmeyin veya BE TTL bağlayın |

XSS ile JS cookie okuyamaz (HttpOnly). XSS hâlâ session adına API çağırabilir; input’lar büyük ölçüde controlled React. `dangerouslySetInnerHTML` kullanılmıyor (mevcut kaynak).

## Yetkilendirme

- Menü `*.menu` **yalnızca UI**. API her çağrıda BE `RoleHasAccess` ile korunmalı.
- Yetkisiz URL Anasayfa’ya düşer; bu güvenlik sınırı değildir.
- `TasksPage` `roleId` 30/60/63 hardcoded — BE list scope ile sapabilir.
- Authorization ekranı permission seed’ini bozabilir → 403 dalgası.

## Consume

FE’de yok; `CONSUME_API_KEY` tarayıcıya konmamalı.

## Public yüzeyler

| Yüzey | Risk |
|-------|------|
| Login `/` | Brute-force FE’de yok (UO/BE) |
| Follow-up `img src` | Backend public `/storage/follow-ups/*` — URL bilen görseli açar |
| `VITE_*` | Bundle’da düz metin — secret koymayın |
| CORS | Yanlış origin + credentials = cookie sızıntısı riski (BE config) |

## Secret yönetimi

Frontend’de secret olmamalı. Tek env API public origin’dir.

`.env` gitignore. `.env.example` yalnızca `VITE_API_BASE_URL`.

## Veri (PII)

Müşteri detayında TC, vergi no, telefon DOM’da. Loglama / screenshot politikası operasyonel.

## Bağımlılık / transport

- HTTPS production’da zorunlu (`Secure` cookie)
- Axios timeout özel set edilmemiş (tarayıcı default)
- Retry: 401 refresh + React Query `retry: 1` (dashboard)

## Checklist (prod)

- [ ] `VITE_API_BASE_URL` doğru ve HTTPS
- [ ] Static host SPA fallback (`index.html`)
- [ ] Backend CORS origin tam eşleşme, credentials açık
- [ ] `AUTH_COOKIE_SECURE=true`
- [ ] Cookie domain / SameSite FE+API ile uyumlu
- [ ] Bundle’da API key / UO token yok
- [ ] Follow-up görsel erişim politikası gözden geçirildi
- [ ] Source map prod’da kontrollü

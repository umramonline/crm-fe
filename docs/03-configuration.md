# Konfigürasyon

Frontend config Vite `import.meta.env` üzerinden gelir. Runtime env okunmaz; değerler **build / dev start** anında gömülür.

## Ortam değişkenleri

| Değişken | Default | Açıklama |
|----------|---------|----------|
| `VITE_API_BASE_URL` | `http://localhost:8321` (kod) | CRM API origin; Axios `baseURL` |

`.env.example`:

```
VITE_API_BASE_URL=http://localhost:8080
```

Kod:

```ts
const defaultApiBaseUrl = "http://localhost:8321";
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl;
```

**Path:** `src/services/apiClient.ts`

> **Not:** `.env.example` default’u (`8080`) ile kod fallback’i (`8321`) farklıdır. Local’de `.env` dosyası yoksa 8321 kullanılır.

## Axios / cookie

`apiClient` sabitleri:

| Ayar | Değer |
|------|-------|
| `baseURL` | `VITE_API_BASE_URL` veya 8321 |
| `withCredentials` | `true` — cookie gönder/al |
| `Accept` | `application/json` |
| `Content-Type` | `application/json` (FormData’da silinir) |

Vite **proxy tanımlı değildir**. Tarayıcı API’ye doğrudan `baseURL` origin’ine gider. Backend CORS + `AllowCredentials` zorunludur.

## Vite

**Path:** `vite.config.ts`

- Plugin: `@vitejs/plugin-react`
- Alias: `@` → `./src` (`tsconfig.app.json` `paths` ile uyumlu)

Dev server varsayılan port: `5173`.

## TypeScript

| Dosya | Rol |
|-------|-----|
| `tsconfig.json` | Project references |
| `tsconfig.app.json` | `src/` — ES2022, `strict`, `@/*` |
| `tsconfig.node.json` | Vite config |

## Test config

**Path:** `vitest.config.ts` — React plugin, `@` alias, `environment: 'jsdom'`.

## Debug

`.vscode/launch.json` Chrome’u `http://localhost:5173` üzerinde açar.

## `.env` vs kod

- `.env` gitignore’dadır; `.env.example` commit edilir
- `VITE_` prefix’i olmayan değişkenler client bundle’a girmez
- Production’da `npm run build` sırasında doğru API URL set edilmelidir; build sonrası değiştirmek için yeniden build gerekir

Detay: [09-ops-deploy.md](./09-ops-deploy.md).

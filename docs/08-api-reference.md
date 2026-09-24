# API Referansı

Frontend açısından: **sayfa path’leri** + **hangi servis hangi backend endpoint’i çağırır**.

**API base:** `VITE_API_BASE_URL` + path’ler `/api/v1/...`  
**Auth:** cookie, `withCredentials: true`  
**Content-Type:** JSON; follow-up create/update `FormData`

Tam HTTP sözleşmesi backend `crm-be/docs/08-api-reference.md`. Consume FE’den çağrılmaz.

## Axios katmanı

**Path:** `src/services/apiClient.ts`

| Davranış | Detay |
|----------|--------|
| 401 retry | `POST /api/v1/auth/refresh` (dedupe), sonra orijinal istek; `_retry` bir kez |
| Auth skip | URL `/api/v1/auth/` içeriyorsa refresh yok |
| FormData | Request interceptor `Content-Type` siler |
| Loading | `startApiLoading` / `stopApiLoading` → overlay “Yükleniyor...” |

Ayrı `refreshClient` interceptor’sızdir (refresh’in 401’i döngüye girmez).

---

## Sayfa route’ları

| Path | Component | Permission |
|------|-----------|------------|
| `/` | `LoginPage` | Public |
| `/home` | `HelloPage` | Oturum |
| `/dashboard` | `DashboardPage` | `dashboard.menu` |
| `/customers` | `CustomersPage` | `customers.menu` |
| `/customers/full-registration/:id` | `CustomerFullRegistrationPage` | `customers.menu` |
| `/tasks` | `TasksPage` | `tasks.menu` |
| `/follow-ups` | `FollowUpsPage` | `follow_ups.menu` |
| `/ietts` | `IettsPage` | `ietts.menu` |
| `/permissions` | `AuthorizationPage` | `authorization.menu` |

Yetkisiz path → `HelloPage` (URL aynı kalabilir).

---

## Auth — `authApi.ts`

| Method | Path | Fonksiyon |
|--------|------|-----------|
| POST | `/api/v1/auth/otp/request` | `requestOtp` |
| POST | `/api/v1/auth/otp/verify` | `verifyOtp` |
| POST | `/api/v1/auth/password/login` | `loginWithPassword` |
| POST | `/api/v1/auth/refresh` | `refreshSession` |
| POST | `/api/v1/auth/logout` | `logout` |
| GET | `/api/v1/auth/session` | `getSession` |

---

## Authorization — `authorizationApi.ts`

| Method | Path | Fonksiyon |
|--------|------|-----------|
| GET | `/api/v1/authorization/roles` | `listRoles` |
| GET | `/api/v1/authorization/modules` | `listModules` |
| POST | `/api/v1/authorization/modules` | `createModule` |
| PUT | `/api/v1/authorization/modules/:id` | `updateModule` |
| DELETE | `/api/v1/authorization/modules/:id` | `deleteModule` |
| GET | `/api/v1/authorization/module-methods` | `listModuleMethods` |
| POST | `/api/v1/authorization/module-methods` | `createModuleMethod` |
| PUT | `/api/v1/authorization/module-methods/:id` | `updateModuleMethod` |
| DELETE | `/api/v1/authorization/module-methods/:id` | `deleteModuleMethod` |
| GET | `/api/v1/authorization/role-permissions` | `listRolePermissions` |
| PUT | `/api/v1/authorization/role-permissions/:role_id` | `replaceRolePermissions` |

---

## Customer — `customerApi.ts`

| Method | Path | Fonksiyon |
|--------|------|-----------|
| GET | `/api/v1/customers` | `listCustomers` |
| POST | `/api/v1/customers` | `createCustomer` |
| GET | `/api/v1/customers/search` | `searchCustomer` |
| GET | `/api/v1/customers/backend/:id` | `getCustomer(..., "backend")` |
| GET | `/api/v1/customers/umramonline/:id` | `getCustomer(..., "umramonline")` |
| GET | `/api/v1/customers/full-registration/:id` | `getFullRegistrationCustomer` |
| GET | `/api/v1/customers/full-registration/:id/phone-exists` | `fullRegistrationPhoneExists` |
| PUT | `/api/v1/customers/full-registration/:id` | `completeFullRegistration` |
| GET | `/api/v1/zones` | `listZones` |
| GET | `/api/v1/cities` | `listCities` |
| GET | `/api/v1/towns` | `listTowns` |
| GET | `/api/v1/branches` | `listBranches` |

FE **çağırmaz:** `GET /customers/:id` (generic), `GET /customers/backend`, `GET /customers/umramonline` liste path’leri, `GET /customers/*/my-branches` — bunlar BE permission/route; liste birleşik `GET /customers`.

---

## Task — `taskApi.ts`

| Method | Path | Fonksiyon |
|--------|------|-----------|
| GET | `/api/v1/tasks` | `listTasks` |
| GET | `/api/v1/tasks/assigned-to-me` | `listAssignedTasks` |
| GET | `/api/v1/tasks/:uuid` | `getTaskDetail` |
| PATCH | `/api/v1/tasks/:uuid/cancel` | `cancelTask` |
| POST | `/api/v1/tasks` | `createTaskAssignment` |
| GET | `/api/v1/branches/:id/users` | `listTaskAssignableUsers` |
| POST | `/api/v1/follow-ups` | `createFollowUp` |
| POST | `/api/v1/follow-ups/standalone` | `createStandaloneFollowUp` |

---

## Follow-up — `followUpApi.ts`

| Method | Path | Fonksiyon |
|--------|------|-----------|
| GET | `/api/v1/follow-ups` | `listFollowUps` |
| GET | `/api/v1/follow-ups/assigned-to-me` | `listAssignedFollowUps` |
| GET | `/api/v1/follow-ups/:uuid` | `getFollowUp` |
| PUT | `/api/v1/follow-ups/:uuid` | `updateFollowUp` |

---

## IETTS — `iettsApi.ts`

| Method | Path | Fonksiyon |
|--------|------|-----------|
| GET | `/api/v1/ietts` | `listIettsRecords` |
| POST | `/api/v1/ietts/:uuid/convert-to-customer` | `convertIettsToCustomer` |

---

## Dashboard — `dashboardApi.ts`

| Method | Path | Fonksiyon |
|--------|------|-----------|
| GET | `/api/v1/dashboard` | `getDashboard` |

---

## Hello

HTTP yok. `HelloPage` yalnızca `SessionData` (rol adı, permission sayısı).

## Sayılar

Yaklaşık **40** backend path FE servislerinden çağrılır. Consume ve static `/storage/follow-ups/*` doğrudan Axios ile listelenmez; görseller `img src` ile `apiBaseUrl + url`.

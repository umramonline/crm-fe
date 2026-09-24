# Authorization modülü

**Path:** `src/features/authorization`  
**Route:** `/permissions`  
**Menü permission:** `authorization.menu`

## Amaç

Modül, module-method ve rol-izin matrisini yönetmek. Roller Umramonline’dan backend proxy ile gelir; local rol tablosu yoktur.

Login/session bu feature’da değildir: [04-auth-and-rbac.md](../04-auth-and-rbac.md).

## Veri kaynakları

Hepsi `/api/v1/authorization/*`. FE UO’ya gitmez.

## Ekranlar / bileşenler

| Bileşen | Rol |
|---------|-----|
| `AuthorizationPage` | Üç form bölgesi: modules, module-methods, role-permissions |

## Permission’lar (UI)

| Name | Kullanım |
|------|----------|
| `modules.form` | Modül formu görünür |
| `modules.list` / `create` / `update` / `delete` | CRUD |
| `module_methods.form` | Method formu |
| `module_methods.list` / `create` / `update` / `delete` | CRUD |
| `role_permissions.form` | Matris görünür |
| `roles.list` | Rol dropdown |
| `role_permissions.list` | Mevcut izinler |
| `role_permissions.update` | Toplu replace kaydet |

## Çağrılan endpoint’ler

| Method | Path | Fonksiyon |
|--------|------|-----------|
| GET | `/api/v1/authorization/roles` | `listRoles` |
| GET | `/api/v1/authorization/modules` | `listModules` |
| POST | `/api/v1/authorization/modules` | `createModule` |
| PUT | `/api/v1/authorization/modules/:id` | `updateModule` |
| DELETE | `/api/v1/authorization/modules/:id` | `deleteModule` |
| GET | `/api/v1/authorization/module-methods` | `listModuleMethods` (`module_id` query) |
| POST | `/api/v1/authorization/module-methods` | `createModuleMethod` |
| PUT | `/api/v1/authorization/module-methods/:id` | `updateModuleMethod` |
| DELETE | `/api/v1/authorization/module-methods/:id` | `deleteModuleMethod` |
| GET | `/api/v1/authorization/role-permissions` | `listRolePermissions` (`role_id`) |
| PUT | `/api/v1/authorization/role-permissions/:role_id` | `replaceRolePermissions` (`module_method_ids`) |

Normalize hem snake_case hem Go export (`ID`, `Name`) alanlarını okur.

## Domain kavramları

- `Role` `{ id, name }`
- `Module` `{ id, name }`
- `ModuleMethod` — `method` boş olabilir (UI-only `*.menu` / `*.form`)
- `RolePermission` `{ id, roleId, moduleMethodId }`
- `HttpMethod` union + `""`

## İş kuralları

- Role-permissions **replace** semantiği: gönderilen id listesi rolün tüm izinleri olur
- Method `path` backend Fiber route template ile birebir olmalı; UI path değiştirmek 403 üretebilir
- `*.menu` / `*.form` için HTTP method/path boş bırakılabilir

> **Not:** Bu ekran yanlış permission kaydıyla uygulamayı kilitleyebilir. Değişiklikler backend `RoleHasAccess` exact match’ine bağlıdır.

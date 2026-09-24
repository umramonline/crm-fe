# Task modülü

**Path:** `src/features/tasks`  
**Route:** `/tasks`  
**Menü permission:** `tasks.menu`

## Amaç

Görev listesi, detay, müşteri satırı iptali, görev bağlamında follow-up oluşturma. Yeni görev atama müşteri ekranından yapılır (`createTaskAssignment` `taskApi.ts` içinde).

## Veri kaynakları

CRM API. Şube kullanıcıları: `GET /api/v1/branches/:id/users` (görev atama). Müşteri detayı görevden açılınca `getCustomer` (backend ve gerekirse umramonline).

## Ekranlar / bileşenler

| Bileşen | Rol |
|---------|-----|
| `TasksPage` | Liste, filtre, detay, iptal, follow-up formu (tek büyük component) |

Görev oluşturma UI: `CustomersPage` içinde (customer feature).

## Permission’lar (UI)

| Name | Kullanım |
|------|----------|
| `tasks.list` | Tüm görev listesi (`roleId` 30/60/63) |
| `tasks.assigned.list` | Atananlar; diğer roller tercih eder |
| `tasks.detail` | Detay |
| `tasks.cancel` | İptal |

Liste seçimi:

```ts
const unrestrictedTaskRoleIds = new Set([30, 60, 63]);
const shouldListOnlyAssignedTasks = !unrestrictedTaskRoleIds.has(roleId);
```

Unrestricted değilse `listAssignedTasks`, aksi halde `listTasks`.

## Çağrılan endpoint’ler

| Method | Path | Fonksiyon |
|--------|------|-----------|
| GET | `/api/v1/tasks` | `listTasks` |
| GET | `/api/v1/tasks/assigned-to-me` | `listAssignedTasks` |
| GET | `/api/v1/tasks/:uuid` | `getTaskDetail` (`tasks_customer_uuid` opsiyonel) |
| PATCH | `/api/v1/tasks/:uuid/cancel` | `cancelTask` (`tasks_customer_uuid` zorunlu) |
| POST | `/api/v1/tasks` | `createTaskAssignment` |
| GET | `/api/v1/branches/:id/users` | `listTaskAssignableUsers` |
| POST | `/api/v1/follow-ups` | `createFollowUp` (multipart) |

## Domain kavramları

- `TaskListItem` / `TaskCustomer`
- `TaskPriority`: `high \| medium \| low`
- `TaskStatus`: `pending \| in_progress \| cancelled \| completed`
- `CreateTaskAssignmentPayload`
- Follow-up enum’ları bu dosyada da durur (`FollowUpVisitType`, anlaşmama nedeni, görüşülen kişi unvanı)

Boş görev başlığı UI’da `"Potansiyel Müşteri"` fallback.

## İş kuralları

- İptal müşteri satırı (`tasks_customer_uuid`) bazlıdır
- Follow-up görselleri `image/jpeg` vb. whitelist (`followUpImageTypes`)
- Visit type UI’da yalnızca `"Yerinde Ziyaret"`
- 422 → `TaskValidationError` / `FollowUpValidationError`
- `userId` / `roleId` `App`’ten prop olarak gelir

## İlişkiler

```
CustomersPage --createTask--> POST /tasks
TasksPage --createFollowUp--> POST /follow-ups
TasksPage --getCustomer--> backend / umramonline detay
```

# Follow-up modülü

**Path:** `src/features/followUps`  
**Route:** `/follow-ups`  
**Menü permission:** `follow_ups.menu`

## Amaç

Ziyaret / takip kayıtlarını listelemek, detay görmek, güncellemek. Görev bağlı create `TasksPage`’de; standalone create müşteri detayı / `StandaloneFollowUpModal`.

## Veri kaynakları

CRM API. Görseller `image.url` göreli ise `apiBaseUrl` ile birleştirilir (`backendAssetUrl`). Mount backend’de public `/storage/follow-ups/*`.

Umramonline HTTP yok. Standalone modal, plus card için `uoId` varsa umramonline müşteri detayı çeker.

## Ekranlar / bileşenler

| Bileşen | Rol |
|---------|-----|
| `FollowUpsPage` | Liste, detay, düzenleme, görsel lightbox, müşteri detayı |
| `StandaloneFollowUpModal` | Task’sız follow-up (customers feature’dan açılır) |

Task bağlı create: `tasks/services/taskApi.ts` → `createFollowUp`.

## Permission’lar (UI)

| Name | Kullanım |
|------|----------|
| `follow_ups.list` | Tam liste (öncelikli) |
| `follow_ups.assigned.list` | `list` yoksa atananlar |
| `follow_ups.detail` | Detay |
| `follow_ups.update` | Güncelle |
| `follow_ups.create.standalone` | Standalone modal (CustomersPage) |
| `customers.detail` / `customers.detail.backend` | Follow-up’tan müşteri detayı |

Liste: `canListFollowUps ? listFollowUps : listAssignedFollowUps`.

## Çağrılan endpoint’ler

| Method | Path | Fonksiyon |
|--------|------|-----------|
| GET | `/api/v1/follow-ups` | `listFollowUps` |
| GET | `/api/v1/follow-ups/assigned-to-me` | `listAssignedFollowUps` |
| GET | `/api/v1/follow-ups/:uuid` | `getFollowUp` |
| PUT | `/api/v1/follow-ups/:uuid` | `updateFollowUp` (multipart) |
| POST | `/api/v1/follow-ups/standalone` | `createStandaloneFollowUp` (`taskApi.ts`) |
| POST | `/api/v1/follow-ups` | `createFollowUp` (`taskApi.ts`) |

Create/update `FormData`: `visit_date`, `visit_type`, `agreement_reached`, `meet_people` (JSON string), `images`, vb. Axios interceptor FormData’da `Content-Type` siler (boundary için).

## Domain kavramları

- `FollowUpListItem` / `FollowUpDetail`
- `FollowUpImage` (`uuid`, `url`)
- `FollowUpMeetPerson`
- `FollowUpUpdateInput` — `existingImageUuids` + yeni `images`

## İş kuralları

- Normal create `tasks_customer_uuid` ister
- Standalone `customer_id` ister
- Update mevcut görselleri uuid listesiyle tutar, yeni dosya ekler
- Anlaşma yoksa `agreement_failure_reason` enum zorunlu (create tarafı)
- Görseller public URL — [10-security.md](../10-security.md)

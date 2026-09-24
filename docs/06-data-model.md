# Veri modeli

Frontend’in “veri modeli” TypeScript tipleri ve form şemalarıdır. Kaynak: feature `*Api.ts` + Zod. Paylaşılan DTO paketi yoktur; snake_case JSON her serviste camelCase’e (kısmen) map edilir.

Envelope her yerde aynı fikir:

```json
{
  "success": true,
  "message": "string",
  "data": {},
  "errors": {}
}
```

`errors` 422’de alan bazlı string map. Pagination ortak şekil: `current_page`, `last_page`, `per_page`, `total`, `from`, `to` → `currentPage`, …

## İlişki özeti (UI)

```
SessionData.permissions[]  →  menü + aksiyon
Customer 1──* CustomerTelephone
TaskListItem 1──* TaskCustomer
FollowUpDetail 1──* FollowUpImage
FollowUpDetail 1──* FollowUpMeetPerson
IettsRecord.customerId? → Customer.id
```

## Auth (`authApi.ts`)

### `Permission`

| Alan | JSON |
|------|------|
| `moduleId` | `module_id` |
| `moduleName` | `module_name` |
| `moduleMethodId` | `module_method_id` |
| `name` | `name` |
| `description` | `description` |
| `method` | `method` |
| `path` | `path` |

### `SessionUser` / `SessionData`

| Alan | JSON | Not |
|------|------|-----|
| `userId` | `user_id` | |
| `user.id` | `user.id` | |
| `user.full_name` | `user.full_name` | camelCase değil |
| `user.phone` | `user.phone` | |
| `user.roleId` | `user.role_id` | |
| `user.roleName` | `user.role_name` | |
| `permissions` | `permissions` | |

Zod: `phoneSchema`, `otpSchema`, `passwordSchema` — [04-auth-and-rbac.md](./04-auth-and-rbac.md).

## Customer (`customerApi.ts`)

### `Customer` (liste)

`id`, `uoId`, `situation`, `unvan`, `cep`, `ad`, `soyad`, `branchId`, `branchName`, `zoneName`, `plusCardNo`, `credit`, `point`, `city`, `town`, `createdAt`, `vehicleStockCount`, `type`.

### `CustomerDetail`

Listeye ek: `yetkiliAdi`, `telefon`, `eposta`, `website`, `googleMapLink`, `classifiedsWebsiteLink`, `mahalle`, `addressDetail`, `ilKodu`, `ilceKodu`, `vergiNo`, `vergiDairesi`, `tcNo`, `dogumTarihi`, `corporateSector`, `telephones`, `plusCardNo`/`credit`/`point` (detayda string).

### Payload’lar

- `CreateCustomerPayload` — `type: bireysel | kurumsal`
- `FullRegistrationPayload` — telephones `{ phoneNumber, title }`
- `CustomerDataSource` — `"umramonline" | "backend"`

Form: `NewCustomerForm` (`customerEntryValidation.ts`).

## Task (`taskApi.ts`)

| Tip | Not |
|-----|-----|
| `TaskPriority` | `high \| medium \| low` |
| `TaskStatus` | `pending \| in_progress \| cancelled \| completed` |
| `TaskListItem` | `uuid`, assignee, branch, dates, `customers[]` |
| `TaskCustomer` | `uuid` (tasks_customer), `customerId`, `status` |
| `CreateTaskAssignmentPayload` | `customerIds: number[]` |

Follow-up create tipleri bu dosyada: `FollowUpFormPayload`, `CreateFollowUpPayload`, `CreateStandaloneFollowUpPayload`.

## Follow-up (`followUpApi.ts`)

`FollowUpListItem`: uuid, task/customer bağları, `agreementReached`, tarihler.

`FollowUpDetail` + `visitType`, `note`, `images`, `meetPeople`.

`FollowUpUpdateInput`: `existingImageUuids`, yeni `File[]`.

## IETTS (`iettsApi.ts`)

`IettsRecord`: belge alanları + `customerId: number | null`.

## Dashboard (`dashboardApi.ts`)

`DashboardStats` — [05-modules/dashboard.md](./05-modules/dashboard.md).

Zod: `dashboardFilterSchema` (`YYYY-MM-DD`, `endDate >= startDate`).

Preset: `DatePresetKey` — today, yesterday, thisWeek, lastWeek, thisMonth, lastMonth.

## Authorization (`authorizationApi.ts`)

`Role`, `Module`, `ModuleMethod` (`method: HttpMethod | ""`), `RolePermission`, `ModuleMethodPayload` (request hâlâ `module_id` snake_case).

## UI copy

Türkçe string’ler kısmen `*Texts.ts` (auth, dashboard, customers, ietts); diğer sayfalarda inline.

## Eksikler / sapmalar

- `branch_ids` session tipinde yok
- Envelope tipi kopyalanmış (DRY değil)
- `user.full_name` normalize edilmemiş
- Görev başlığı boşsa `"Potansiyel Müşteri"`

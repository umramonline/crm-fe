# Dashboard modülü

**Path:** `src/features/dashboard`  
**Route:** `/dashboard`  
**Menü permission:** `dashboard.menu`

## Amaç

Tarih aralığına göre KPI kartları göstermek. Metrik kaynağı (local MySQL vs Umramonline) backend’de birleşir; FE tek `GET /api/v1/dashboard` çağırır.

## Veri kaynakları

- KPI: `getDashboard({ startDate, endDate })`
- Şube etiketi: `listBranches()` (`customerApi`) — kart üstünde virgülle birleşik isim; filtre olarak `branch_ids` **gönderilmez** (kapsam session/backend)

Tek feature React Query kullanan yer: `useDashboardPage`.

## Ekranlar / bileşenler

| Bileşen | Rol |
|---------|-----|
| `DashboardPage` | `dashboard.view` yoksa mesaj; varsa hook + kartlar |
| `useDashboardPage` | Draft/applied range, preset, query |
| `dateRangePresets` | Bugün, dün, bu hafta/ay, geçen hafta/ay |

Varsayılan aralık: bugün dahil son 7 gün (`createDefaultDateRange`).

## Permission’lar (UI)

| Name | Kullanım |
|------|----------|
| `dashboard.menu` | Route |
| `dashboard.view` | Veri çekme / kartlar (`enabled: canViewDashboard`) |

## Çağrılan endpoint’ler

| Method | Path | Fonksiyon |
|--------|------|-----------|
| GET | `/api/v1/dashboard` | `getDashboard` — query `start_date`, `end_date` (`YYYY-MM-DD`) |
| GET | `/api/v1/branches` | `listBranches` |

## Domain kavramları

`DashboardStats`:

| Alan | Backend JSON |
|------|----------------|
| `potentialCustomerCount` | `potential_customer_count` |
| `totalCustomerCount` | `total_customer_count` |
| `customerVisitCount` | `customer_visit_count` |
| `newCustomerCount` | `new_customer_count` |
| `vehicleEntryCount` | `vehicle_entry_count` |
| `totalAmount` | `total_amount` |
| `loadedCreditAmount` | `loaded_credit_amount` |
| `vehicleStockCount` | `vehicle_stock_count` |
| `pendingTaskCount` | `pending_task_count` |
| `inProgressTaskCount` | `in_progress_task_count` |
| `completedTaskCount` | `completed_task_count` |
| `overdueTaskCount` | `overdue_task_count` |

Filtre Zod: `dashboardFilterSchema` — bitiş ≥ başlangıç.

## İş kuralları

- Query `enabled` yalnızca `dashboard.view` + dolu tarih
- `staleTime` branch listesi 5 dakika
- `refetchOnWindowFocus: false` (global QueryClient)
- Geçersiz tarih client-side; API’ye gitmez

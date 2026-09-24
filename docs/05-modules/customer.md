# Customer modülü

**Path:** `src/features/customers`  
**Route:** `/customers`, `/customers/full-registration/:id`  
**Menü permission:** `customers.menu`

## Amaç

Galeri / müşteri listesi, arama, minimal oluşturma, detay, tam kayıt (full registration). Görev atama ve standalone follow-up müşteri detayından bu ekranda başlar.

## Veri kaynakları

Liste tek endpoint: `GET /api/v1/customers` (kaynak birleşimi backend’de, permission’a göre).

Detay iki path:

| `CustomerDataSource` | Path |
|----------------------|------|
| `backend` | `GET /api/v1/customers/backend/:id` |
| `umramonline` | `GET /api/v1/customers/umramonline/:id` |

Liste satırından açılan detay `backend` id kullanır. Görev ekranı `uoId > 0` ise Umramonline detay da ister. Arama sonucu `source` alanı `backend` / `umramonline` döner.

Referans listeleri (zones, cities, towns, branches) CRM API üzerinden gelir; UO çağrısı FE’de yoktur.

## Ekranlar / bileşenler

| Bileşen | Rol |
|---------|-----|
| `CustomersPage` | Filtreli tablo, detay paneli, görev/follow-up tetikleri |
| `CustomerEntryModal` | Yeni müşteri (bireysel / kurumsal) |
| `CustomerSearchModal` | `q` ile arama |
| `CustomerFullRegistrationPage` | 4 adımlı tam kayıt |

Deep link: `navigateToFullRegistration` (`shared/utils/navigation.ts`) → `/customers/full-registration/:id` + `popstate`.

## Permission’lar (UI)

| Name | Kullanım |
|------|----------|
| `customers.list` / `customers.list.umramonline` / `customers.list.backend` / `*.my_branches` | Liste yüklenebilir |
| `customers.zones.list` | Bölge filtresi |
| `customers.search` | Arama modalı |
| `customers.detail` / `customers.detail.backend` / `customers.detail.umramonline` | Detay |
| `customers.full_registration.detail` | Tam kayıt sayfası |
| `customers.create` | Yeni müşteri |
| `customers.cities.list` / `customers.towns.list` / `customers.branches.list` | Form dropdown |
| `tasks.create` | Görev atama (müşteri detayı) |
| `follow_ups.create.standalone` | Standalone follow-up |

## Çağrılan endpoint’ler

| Method | Path | Fonksiyon |
|--------|------|-----------|
| GET | `/api/v1/customers` | `listCustomers` |
| POST | `/api/v1/customers` | `createCustomer` |
| GET | `/api/v1/customers/search` | `searchCustomer` |
| GET | `/api/v1/customers/backend/:id` | `getCustomer(id, "backend")` |
| GET | `/api/v1/customers/umramonline/:id` | `getCustomer(id, "umramonline")` |
| GET | `/api/v1/customers/full-registration/:id` | `getFullRegistrationCustomer` |
| GET | `/api/v1/customers/full-registration/:id/phone-exists` | `fullRegistrationPhoneExists` |
| PUT | `/api/v1/customers/full-registration/:id` | `completeFullRegistration` |
| GET | `/api/v1/zones` | `listZones` |
| GET | `/api/v1/cities` | `listCities` |
| GET | `/api/v1/towns` | `listTowns` (`city_id`) |
| GET | `/api/v1/branches` | `listBranches` |

422 cevapları `CustomerValidationError` olarak fırlatılır.

## Domain kavramları

- `Customer` — liste satırı
- `CustomerDetail` — detay + `telephones`
- `CreateCustomerPayload` / `FullRegistrationPayload`
- `CustomerListQuery` / `CustomerListResult` / `CustomerPagination`
- `Zone`, `City`, `Town`, `Branch`

Tipler: [06-data-model.md](../06-data-model.md).

## İş kuralları

- Telefon: `05XXXXXXXXX` (`customerEntryValidation.ts` + backend)
- Bireysel: ad, soyad, cep zorunlu; kurumsal: unvan, yetkili adı, telefon zorunlu
- İl / ilçe / mahalle / bayi her iki tipte zorunlu
- Full registration kurumsal sektör sabit liste: Teknoloji, İnşaat, Otomotiv, Gıda, Tekstil, Sağlık, Eğitim, Finans, Turizm, Diğer
- Tam kayıt 4 adım; cep uniqueness `phone-exists` ile kontrol edilir
- Metinlerde max length client-side vardır
- Liste filtre + sort (`credit`, `point`, `created_at`, `vehicle_stock_count`)

# IETTS modülü

**Path:** `src/features/ietts`  
**Route:** `/ietts`  
**Menü permission:** `ietts.menu`

## Amaç

IETTS belge kayıtlarını listelemek ve seçilen kaydı CRM müşterisine dönüştürmek; ardından tam kayıt sayfasına yönlendirmek.

## Veri kaynakları

Yalnızca CRM API (`GET /api/v1/ietts`). Umramonline çağrısı yok. Import/scrape süreci bu repoda yoktur (eski Laravel CRM’deki scrape kapsam dışı).

## Ekranlar / bileşenler

| Bileşen | Rol |
|---------|-----|
| `IettsPage` | Toolbar (Filtrele/Temizle/Export), özet footer, modal tetikleme |
| `IettsDataTable` | Tabulator remote liste (pilot kalıbı) |
| `ConvertIettsToCustomerModal` | Onay → convert → full registration |

Metinler: `constants/iettsTexts.ts`.

## Permission’lar (UI)

| Name | Kullanım |
|------|----------|
| `ietts.list` | Sayfa + tablo |
| `ietts.convert_to_customer` | Satırda dönüştür butonu |

## Çağrılan endpoint’ler

| Method | Path | Fonksiyon |
|--------|------|-----------|
| GET | `/api/v1/ietts` | `listIettsRecords` |
| POST | `/api/v1/ietts/:uuid/convert-to-customer` | `convertIettsToCustomer` → `customer_id` |

Başarılı convert: `navigateToFullRegistration(customerId)`.

## Tabulator (pilot)

- Remote sayfalama (20), filtre (Filtrele/Temizle), tüm veri kolonlarında remote sıralama (varsayılan: `createdAt` desc)
- Footer: Tabulator sayfalama + **Sayfa boyutu** seçici (`paginationSizeSelector`, AdminLTE Data Tables); `card-footer` yalnızca toplam özeti
- Export CSV/JSON (Türkçe toolbar): **yalnızca görünen sayfa** (`exportCurrentPageHint`; mobilde ayrı satır)
- Hata metni: `readApiErrorMessage` (liste + convert)
- Paylaşılan Tabulator TR locale: `shared/tabulator/crmTabulatorTrLocale.ts`
- Dönüştürülmüş kayıt (`customerId`): yeşil “müşteri kaydına git” aksiyonu
- Stil: `list-table-card` + `.crm-tabulator` (`global.css`)

## Domain kavramları

- `IettsRecord` — belge alanları + opsiyonel `customerId`
- `IettsListQuery` / `IettsListResult`

Backend sort alanları: `document_number`, `company_name`, `business_name`, `business_address`, `document_issue_date`, `document_status`, `city`, `district`, `created_at`; geçersiz/boş sort → `id DESC`.

## İş kuralları

- `customerId` dolu → convert gizli, müşteri formuna git gösterilir
- Backend tekrar convert’te mevcut `customer_id` döner (idempotent)
- Convert hata/boş `customer_id` → `iettsTexts.convertFailed`
- Full registration `customers.menu` yoksa `App` fallback Anasayfa’ya düşer; convert yine de müşteri oluşturmuş olabilir

# IETTS modülü

**Path:** `src/features/ietts`  
**Route:** `/ietts`  
**Menü permission:** `ietts.menu`

## Amaç

IETTS belge kayıtlarını listelemek ve seçilen kaydı CRM müşterisine dönüştürmek; ardından tam kayıt sayfasına yönlendirmek.

## Veri kaynakları

Yalnızca CRM API (`GET /api/v1/ietts`). Umramonline çağrısı yok. Import süreci bu repoda yoktur.

## Ekranlar / bileşenler

| Bileşen | Rol |
|---------|-----|
| `IettsPage` | Filtreli tablo |
| `ConvertIettsToCustomerModal` | Onay → convert → full registration |

Metinler: `constants/iettsTexts.ts`.

## Permission’lar (UI)

| Name | Kullanım |
|------|----------|
| `ietts.list` | Liste |
| `ietts.convert_to_customer` | Dönüştür butonu |

## Çağrılan endpoint’ler

| Method | Path | Fonksiyon |
|--------|------|-----------|
| GET | `/api/v1/ietts` | `listIettsRecords` |
| POST | `/api/v1/ietts/:uuid/convert-to-customer` | `convertIettsToCustomer` → `customer_id` |

Başarılı convert: `navigateToFullRegistration(customerId)`.

## Domain kavramları

- `IettsRecord` — belge alanları + opsiyonel `customerId`
- `IettsListQuery` / `IettsListResult`

Sort: `document_issue_date`, `created_at`.

## İş kuralları

- `customerId` dolu kayıtlar zaten dönüştürülmüş kabul edilir (UI’da convert kapatılabilir)
- Convert hata/boş `customer_id` → `iettsTexts.convertFailed`
- Full registration `customers.menu` yoksa `App` fallback Anasayfa’ya düşer; convert yine de müşteri oluşturmuş olabilir

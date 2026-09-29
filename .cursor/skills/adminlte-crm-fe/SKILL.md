---
name: adminlte-crm-fe
description: >-
  crm-fe UI — birincil kılavuz github.com/ColorlibHQ/adminlte-react. Layout,
  ContentHeader/AppContent, liste, modal, form. Eski CRM sunumu bu modele taşınır.
disable-model-invocation: true
---

# AdminLTE crm-fe UI Skill

## Mimari (Clean Architecture)

- UI = sunum; iş kuralları backend’de, client’ta minimal
- HTTP sadece `*Api.ts`; component’lerden doğrudan Axios yok
- Standartlar: repo `.cursor/rules/clean-architecture.mdc`, skill `umran-crm-standards`

## Ne zaman kullan

- crm-fe’de görsel/layout değişikliği
- Yeni sayfa veya modal ekleme
- AdminLTE component entegrasyonu
- Form accessibility (`id`/`name`) düzeltmeleri
- Sidebar/menü/topbar/footer davranışı

## Hızlı checklist

1. API/hooks/routing logic’e dokunma (gerekmedikçe)
2. Shell: `DashboardShell` + `DashboardLayout` — README props; topbar replace yok
3. Başlık: `ContentHeader` (AppContent); menü icon `bi-house` formatı
4. Navigasyon: `SpaLink` + `App.tsx`
5. Modal: `ControlledModal`
6. Form: `formFieldProps` / filter input-select; mümkünse `@adminlte/react` Input/Select
7. CSS: AdminLTE 4 token’ları; legacy ALTE3 zorlaması yok
7. `npm run build && npm test`

## Layout örneği

```tsx
// DashboardShell zaten App.tsx'te — sayfa sadece içerik döner
import { ContentHeader } from "@/shared/components/ContentHeader";

export function MyPage() {
  return (
    <>
      <ContentHeader title="Başlık" breadcrumbs={[{ label: "Ana Sayfa" }]} />
      <div className="card">
        <div className="card-body">...</div>
      </div>
    </>
  );
}
```

## Liste sayfası (Tabulator)

CRM listeleri (IETTS, Görevler, Takipler, Galeri): `*DataTable` + `shared/tabulator/crmRemoteTabulator.ts`.

```tsx
<div className="card list-table-card mb-3">
  <form className="customer-filter-form" onSubmit={handleFilterSubmit}>
    <ListTableToolbar>
      {/* Filtrele → tableRef.applyFilters(); Temizle → clearFilters(); isteğe CSV/JSON */}
    </ListTableToolbar>
    <div className="card-body p-0">
      <CustomersDataTable ref={tableRef} onLoadMeta={setListMeta} ... />
    </div>
    <div className="card-footer list-table-footer py-2">
      <span className="text-muted small">Toplam … · Sayfa …</span>
    </div>
  </form>
</div>
```

Header filtreler Tabulator kolonlarında; **Filtrele** DOM değerlerini commit eder (`applyCrmTableFilters`). Geniş grid (Galeri): `responsiveLayout: false` + yatay kaydırma.

## Modal / sayfa formu

- Bölümler: `CrmFormSection` (`@adminlte/react` `Card`, `variant="outline"`)
- Alanlar: `CrmFormInput` / `CrmFormSelect` / `CrmFormTextarea` → `Input` / `Select` / `Textarea` + `formFieldProps`
- Grid: `row g-3` + `CrmFormFieldCol`
- Dosya: `InputFile` (resim yükleme)
- Modal kabuğu: `ControlledModal` + footer `Button` + `form={id}` submit

## Referanslar

- Plan: `~/.cursor/plans/adminlte_migration_plan_de65baea.plan.md`
- Docs: `crm-fe/docs/11-adminlte-migration.md`
- Rule: `crm-fe/.cursor/rules/adminlte-react.mdc`
- GitHub: https://github.com/ColorlibHQ/adminlte-react

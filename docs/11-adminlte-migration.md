# AdminLTE / @adminlte/react (crm-fe)

## Birincil kılavuz

Tüm yeni UI ve eski CRM ekranlarının taşınması **[adminlte-react](https://github.com/ColorlibHQ/adminlte-react)** README’sindeki layout, bileşen ve styling modeline göre yapılır. Canlı demo yalnızca görsel referanstır.

## Strateji

1. Shell: `DashboardLayout` + `MenuNode[]` + `SpaLink` (Vite SPA)
2. Sayfa başlığı: `ContentHeader` → `AppContent`
3. Auth: `AuthLayout`, `Input`, `Button`
4. Widget / liste: `Card`, `SmallBox`, Bootstrap `table` veya `@adminlte/react` `Table`
5. İş/API katmanı değişmez (`*Api.ts`, hooks, `App.tsx` routing)

## Shell dosyaları

| Path | Açıklama |
|------|----------|
| `src/shared/layout/DashboardShell.tsx` | `DashboardLayout` wrapper |
| `src/shared/layout/SpaLink.tsx` | SPA link adapter |
| `src/shared/layout/menuItems.ts` | Permission menüsü (`icon: "bi-house"`) |
| `src/shared/components/ContentHeader.tsx` | `AppContent` adapter |
| `src/shared/layout/CrmUserMenuManager.tsx` | Logout |
| `src/shims/next-navigation.ts` | `next/navigation` shim |

## CSS

`main.tsx`: Bootstrap → `adminlte.min.css` → `adminlte-colors-v3.css` → icons → `global.css`.

CRM görünümü: light modda açık içerik (`#f4f6f9`), **sidebar her modda koyu** (`crm-dark-sidebar` + `sidebarTheme="dark"`).

## Sayfa durumu

| Alan | Bileşen |
|------|---------|
| Auth | `AuthLayout`, `Input`, `Button` |
| Anasayfa / Dashboard | `ContentHeader`, `SmallBox`, `Card` |
| IETTS | Tabulator pilot: `IettsDataTable`, Export CSV/JSON |
| Diğer listeler | `ContentHeader`, `list-table-card`, filter row, `ListPagination` |
| Modals | `ControlledModal` |
| İzinler | `@adminlte/react` `Table` |

`@adminlte/react` `Datatable` sarmalayıcısı aksiyon hücreleri / CRM API için yetersiz; pilot doğrudan `tabulator-tables` + Bootstrap 5 teması kullanır ([Data Tables demo](https://adminlte.io/themes/next-react/tables/data/) ile aynı altyapı).

## Agent

- Rule: `crm-fe/.cursor/rules/adminlte-react.mdc`
- Skill: `crm-fe/.cursor/skills/adminlte-crm-fe/SKILL.md`

## Doğrulama

```bash
cd crm-fe && npm run build && npm test
```

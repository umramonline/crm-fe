/** Tabulator `langs.tr` — CRM listeleri (IETTS pilot). */
export const crmTabulatorTurkishLangs = {
  tr: {
    pagination: {
      first: "İlk",
      first_title: "İlk sayfa",
      last: "Son",
      last_title: "Son sayfa",
      prev: "Önceki",
      prev_title: "Önceki sayfa",
      next: "Sonraki",
      next_title: "Sonraki sayfa",
      page_size: "Sayfa boyutu",
      counter: {
        showing: "Gösterilen",
        of: "/",
        rows: "kayıt",
        pages: "sayfa",
      },
    },
    headerFilters: {
      default: "Filtrele…",
    },
  },
} as const;

export const CRM_LIST_PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

export type CrmListPageSize = (typeof CRM_LIST_PAGE_SIZE_OPTIONS)[number];

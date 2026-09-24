import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import {
  TabulatorFull as Tabulator,
  type ColumnDefinition,
  type Options,
} from "tabulator-tables";

import { iettsTexts } from "@/features/ietts/constants/iettsTexts";
import {
  listIettsRecords,
  type IettsListQuery,
  type IettsRecord,
} from "@/features/ietts/services/iettsApi";

export type IettsDataTableHandle = {
  applyFilters: () => void;
  clearFilters: () => void;
  downloadCsv: () => void;
  downloadJson: () => void;
};

type IettsDataTableProps = {
  canConvertToCustomer: boolean;
  onConvert: (uuid: string) => void;
  onError: (message: string) => void;
};

function sortFieldToApi(field?: string): IettsListQuery["sortBy"] {
  if (field === "documentIssueDate") {
    return "document_issue_date";
  }
  if (field === "createdAt") {
    return "created_at";
  }
  return "";
}

function formatDate(value: string): string {
  if (!value) {
    return "-";
  }
  return value.slice(0, 10);
}

function formatDateTime(value: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 19).replace("T", " ");
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function buildColumns(canConvert: boolean): ColumnDefinition[] {
  const columns: ColumnDefinition[] = [];

  if (canConvert) {
    columns.push({
      title: iettsTexts.columns.actions,
      field: "_actions",
      width: 72,
      headerSort: false,
      hozAlign: "center",
      formatter: (cell) => {
        const row = cell.getRow().getData() as IettsRecord;
        if (row.customerId || !row.uuid) {
          return "";
        }
        return `<button type="button" class="btn btn-primary btn-sm" data-ietts-convert="1" aria-label="${iettsTexts.convertToCustomer}" title="${iettsTexts.convertToCustomer}"><i class="bi bi-person-plus-fill" aria-hidden="true"></i></button>`;
      },
      cellClick: (event, cell) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }
        if (!target.closest("[data-ietts-convert]")) {
          return;
        }
        const row = cell.getRow().getData() as IettsRecord;
        if (row.uuid) {
          onConvertRef.current(row.uuid);
        }
      },
    });
  }

  columns.push(
    {
      title: iettsTexts.columns.documentNumber,
      field: "documentNumber",
      headerFilter: "input",
      headerFilterPlaceholder: "…",
      minWidth: 120,
    },
    {
      title: iettsTexts.columns.companyName,
      field: "companyName",
      headerFilter: "input",
      headerFilterPlaceholder: "…",
      minWidth: 140,
    },
    {
      title: iettsTexts.columns.businessName,
      field: "businessName",
      headerFilter: "input",
      headerFilterPlaceholder: "…",
      minWidth: 140,
    },
    {
      title: iettsTexts.columns.businessAddress,
      field: "businessAddress",
      headerFilter: "input",
      headerFilterPlaceholder: "…",
      minWidth: 160,
    },
    {
      title: iettsTexts.columns.documentIssueDate,
      field: "documentIssueDate",
      headerFilter: "input",
      headerFilterPlaceholder: "…",
      sorter: "string",
      minWidth: 130,
      formatter: (cell) => formatDate(String(cell.getValue() ?? "")),
    },
    {
      title: iettsTexts.columns.documentStatus,
      field: "documentStatus",
      headerFilter: "input",
      headerFilterPlaceholder: "…",
      minWidth: 120,
    },
    {
      title: iettsTexts.columns.city,
      field: "city",
      headerFilter: "input",
      headerFilterPlaceholder: "…",
      minWidth: 100,
    },
    {
      title: iettsTexts.columns.district,
      field: "district",
      headerFilter: "input",
      headerFilterPlaceholder: "…",
      minWidth: 100,
    },
    {
      title: iettsTexts.columns.createdAt,
      field: "createdAt",
      headerFilter: "input",
      headerFilterPlaceholder: "…",
      sorter: "string",
      minWidth: 150,
      formatter: (cell) => formatDateTime(String(cell.getValue() ?? "")),
    },
  );

  return columns;
}

const onConvertRef = { current: (_uuid: string) => {} };

export const IettsDataTable = forwardRef<IettsDataTableHandle, IettsDataTableProps>(
  function IettsDataTable({ canConvertToCustomer, onConvert, onError }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const tabulatorRef = useRef<Tabulator | null>(null);

    onConvertRef.current = onConvert;

    useImperativeHandle(ref, () => ({
      applyFilters() {
        const table = tabulatorRef.current;
        if (!table) {
          return;
        }
        void table.setPage(1).then(() => table.replaceData());
      },
      clearFilters() {
        const table = tabulatorRef.current;
        if (!table) {
          return;
        }
        table.clearHeaderFilter();
        void table.setPage(1).then(() => table.replaceData());
      },
      downloadCsv() {
        tabulatorRef.current?.download("csv", "ietts.csv");
      },
      downloadJson() {
        tabulatorRef.current?.download("json", "ietts.json");
      },
    }));

    useEffect(() => {
      const element = containerRef.current;
      if (!element) {
        return;
      }

      const filterFieldMap: Record<string, keyof IettsListQuery> = {
        documentNumber: "documentNumber",
        companyName: "companyName",
        businessName: "businessName",
        businessAddress: "businessAddress",
        documentIssueDate: "documentIssueDate",
        documentStatus: "documentStatus",
        city: "city",
        district: "district",
        createdAt: "createdAt",
      };

      const options: Options = {
        layout: "fitColumns",
        responsiveLayout: "collapse",
        placeholder: iettsTexts.loading,
        pagination: true,
        paginationMode: "remote",
        paginationSize: 20,
        paginationInitialPage: 1,
        paginationCounter: "rows",
        sortMode: "remote",
        filterMode: "remote",
        headerFilterLiveFilterDelay: 86400000,
        ajaxURL: "ietts-crm",
        ajaxRequestFunc: async (_url, _config, params) => {
          const requestParams = params as {
            page?: number;
            size?: number;
            sort?: Array<{ field: string; dir: "asc" | "desc" }>;
            filter?: Array<{ field: string; value: unknown }>;
          };

          const query: IettsListQuery = {
            page: requestParams.page ?? 1,
            perPage: requestParams.size ?? 20,
            sortOrder: requestParams.sort?.[0]?.dir ?? "desc",
            sortBy: sortFieldToApi(requestParams.sort?.[0]?.field),
          };

          for (const filter of requestParams.filter ?? []) {
            const key = filterFieldMap[filter.field];
            const value = String(filter.value ?? "").trim();
            if (key && value) {
              (query as Record<string, string | number | undefined>)[key] =
                value;
            }
          }

          try {
            const result = await listIettsRecords(query);
            return {
              data: result.items,
              last_page: Math.max(1, result.pagination.lastPage),
            };
          } catch {
            onError(iettsTexts.loadFailed);
            return {
              data: [],
              last_page: 1,
            };
          }
        },
        columns: buildColumns(canConvertToCustomer),
        locale: "tr",
        langs: {
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
        },
      };

      const table = new Tabulator(element, options);
      tabulatorRef.current = table;

      return () => {
        table.destroy();
        tabulatorRef.current = null;
      };
    }, [canConvertToCustomer, onError]);

    return (
      <div
        ref={containerRef}
        className="ietts-tabulator crm-tabulator"
        aria-label={iettsTexts.pageTitle}
      />
    );
  },
);

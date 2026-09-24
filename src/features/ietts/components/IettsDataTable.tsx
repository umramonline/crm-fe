import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import {
  TabulatorFull as Tabulator,
  type ColumnDefinition,
} from "tabulator-tables";

import { iettsTexts } from "@/features/ietts/constants/iettsTexts";
import {
  listIettsRecords,
  type IettsListQuery,
  type IettsRecord,
} from "@/features/ietts/services/iettsApi";
import { CRM_LIST_PAGE_SIZE_OPTIONS } from "@/shared/tabulator/crmTabulatorTrLocale";
import {
  applyCrmTableFilters,
  createCrmRemoteTabulatorOptions,
  createRemoteSortState,
  mapHeaderFilters,
  syncRemoteSortFromParams,
  type CrmListMeta,
  type CrmRemoteTabulatorHandle,
  type TabulatorSortParam,
} from "@/shared/tabulator/crmRemoteTabulator";
import { readApiErrorMessage } from "@/shared/utils/apiErrorMessage";

export type IettsDataTableHandle = CrmRemoteTabulatorHandle;

export type IettsListMeta = CrmListMeta;

type IettsDataTableProps = {
  canConvertToCustomer: boolean;
  onConvert: (uuid: string) => void;
  onViewCustomer: (customerId: number) => void;
  onError: (message: string) => void;
  onLoadMeta?: (meta: IettsListMeta) => void;
  onLoadingChange?: (isLoading: boolean) => void;
};

const sortFieldToApiMap: Record<string, NonNullable<IettsListQuery["sortBy"]>> = {
  documentNumber: "document_number",
  companyName: "company_name",
  businessName: "business_name",
  businessAddress: "business_address",
  documentIssueDate: "document_issue_date",
  documentStatus: "document_status",
  city: "city",
  district: "district",
  createdAt: "created_at",
};

function sortFieldToApi(field?: string): IettsListQuery["sortBy"] {
  if (!field) {
    return "";
  }

  return sortFieldToApiMap[field] ?? "";
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

const tableCallbacksRef = {
  onConvert: (_uuid: string) => {},
  onViewCustomer: (_customerId: number) => {},
  onError: (_message: string) => {},
  onLoadMeta: (_meta: IettsListMeta) => {},
  onLoadingChange: (_isLoading: boolean) => {},
};

function buildColumns(canConvert: boolean): ColumnDefinition[] {
  const columns: ColumnDefinition[] = [
    {
      title: iettsTexts.columns.actions,
      field: "_actions",
      width: 88,
      headerSort: false,
      hozAlign: "center",
      formatter: (cell) => {
        const row = cell.getRow().getData() as IettsRecord;
        if (row.customerId) {
          return `<button type="button" class="btn btn-success btn-sm" data-ietts-view-customer="1" aria-label="${iettsTexts.viewCustomerRecord}" title="${iettsTexts.viewCustomerRecord}"><i class="bi bi-person-check-fill" aria-hidden="true"></i></button>`;
        }
        if (canConvert && row.uuid) {
          return `<button type="button" class="btn btn-primary btn-sm" data-ietts-convert="1" aria-label="${iettsTexts.convertToCustomer}" title="${iettsTexts.convertToCustomer}"><i class="bi bi-person-plus-fill" aria-hidden="true"></i></button>`;
        }
        return `<span class="text-muted">-</span>`;
      },
      cellClick: (event, cell) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }

        const row = cell.getRow().getData() as IettsRecord;

        if (target.closest("[data-ietts-view-customer]") && row.customerId) {
          tableCallbacksRef.onViewCustomer(row.customerId);
          return;
        }

        if (target.closest("[data-ietts-convert]") && row.uuid) {
          tableCallbacksRef.onConvert(row.uuid);
        }
      },
    },
    {
      title: iettsTexts.columns.documentNumber,
      field: "documentNumber",
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "…",
      minWidth: 120,
    },
    {
      title: iettsTexts.columns.companyName,
      field: "companyName",
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "…",
      minWidth: 140,
    },
    {
      title: iettsTexts.columns.businessName,
      field: "businessName",
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "…",
      minWidth: 140,
    },
    {
      title: iettsTexts.columns.businessAddress,
      field: "businessAddress",
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "…",
      minWidth: 160,
    },
    {
      title: iettsTexts.columns.documentIssueDate,
      field: "documentIssueDate",
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: iettsTexts.dateFilterPlaceholder,
      sorter: "date",
      minWidth: 130,
      formatter: (cell) => formatDate(String(cell.getValue() ?? "")),
    },
    {
      title: iettsTexts.columns.documentStatus,
      field: "documentStatus",
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "…",
      minWidth: 120,
    },
    {
      title: iettsTexts.columns.city,
      field: "city",
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "…",
      minWidth: 100,
    },
    {
      title: iettsTexts.columns.district,
      field: "district",
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "…",
      minWidth: 100,
    },
    {
      title: iettsTexts.columns.createdAt,
      field: "createdAt",
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: iettsTexts.dateFilterPlaceholder,
      sorter: "datetime",
      minWidth: 150,
      formatter: (cell) => formatDateTime(String(cell.getValue() ?? "")),
    },
  ];

  return columns;
}

export const IettsDataTable = forwardRef<IettsDataTableHandle, IettsDataTableProps>(
  function IettsDataTable(
    {
      canConvertToCustomer,
      onConvert,
      onViewCustomer,
      onError,
      onLoadMeta,
      onLoadingChange,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const tabulatorRef = useRef<Tabulator | null>(null);

    tableCallbacksRef.onConvert = onConvert;
    tableCallbacksRef.onViewCustomer = onViewCustomer;
    tableCallbacksRef.onError = onError;
    tableCallbacksRef.onLoadMeta = onLoadMeta ?? (() => {});
    tableCallbacksRef.onLoadingChange = onLoadingChange ?? (() => {});

    useImperativeHandle(ref, () => ({
      applyFilters() {
        applyCrmTableFilters(tabulatorRef.current);
      },
      clearFilters() {
        const table = tabulatorRef.current;
        if (!table) {
          return;
        }
        table.clearHeaderFilter();
        void table.setPage(1);
      },
      downloadCsv(filename) {
        tabulatorRef.current?.download("csv", filename);
      },
      downloadJson(filename) {
        tabulatorRef.current?.download("json", filename);
      },
      refresh() {
        tabulatorRef.current?.replaceData();
      },
    }));

    useEffect(() => {
      const element = containerRef.current;
      if (!element) {
        return;
      }

      let tableInstance: Tabulator | null = null;
      const remoteSort = createRemoteSortState("createdAt", "desc");

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

      const table = new Tabulator(
        element,
        createCrmRemoteTabulatorOptions({
          placeholder: iettsTexts.noRecords,
          ajaxURL: "ietts-crm",
          initialSort: { column: "createdAt", dir: "desc" },
          remoteSort,
          getTableInstance: () => tableInstance,
          columns: buildColumns(canConvertToCustomer),
          ajaxRequestFunc: async (_url, _config, params) => {
            tableCallbacksRef.onLoadingChange(true);

            const requestParams = params as {
              page?: number;
              size?: number;
              sort?: TabulatorSortParam[];
              filter?: Array<{ field: string; value: unknown }>;
            };

            syncRemoteSortFromParams(
              requestParams.sort,
              tableInstance,
              remoteSort,
            );

            const query: IettsListQuery = {
              page: requestParams.page ?? 1,
              perPage: requestParams.size ?? CRM_LIST_PAGE_SIZE_OPTIONS[0],
              sortBy: sortFieldToApi(remoteSort.field),
              sortOrder: remoteSort.dir,
              ...mapHeaderFilters<IettsListQuery>(
                requestParams.filter,
                filterFieldMap,
              ),
            };

            try {
              const result = await listIettsRecords(query);
              const lastPage = Math.max(1, result.pagination.lastPage);
              const currentPage = result.pagination.currentPage || 1;

              tableCallbacksRef.onLoadMeta({
                total: result.pagination.total,
                currentPage,
                lastPage,
              });

              return {
                data: result.items,
                last_page: lastPage,
                last_row: result.pagination.total,
              };
            } catch (error) {
              tableCallbacksRef.onError(
                readApiErrorMessage(error, iettsTexts.loadFailed),
              );
              tableCallbacksRef.onLoadMeta({ total: 0, currentPage: 1, lastPage: 1 });
              return { data: [], last_page: 1, last_row: 0 };
            } finally {
              tableCallbacksRef.onLoadingChange(false);
            }
          },
        }),
      );
      tableInstance = table;
      tabulatorRef.current = table;

      return () => {
        table.destroy();
        tabulatorRef.current = null;
      };
    }, [canConvertToCustomer]);

    return (
      <div
        ref={containerRef}
        className="ietts-tabulator crm-tabulator"
        aria-label={iettsTexts.pageTitle}
      />
    );
  },
);

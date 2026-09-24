import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { TabulatorFull as Tabulator, type ColumnDefinition } from "tabulator-tables";

import {
  type FollowUpListItem,
  type FollowUpListQuery,
  type FollowUpListResult,
} from "@/features/followUps/services/followUpApi";
import {
  formatTabulatorAgreement,
  formatTabulatorDate,
} from "@/shared/tabulator/crmTabulatorFormatters";
import { CRM_LIST_PAGE_SIZE_OPTIONS } from "@/shared/tabulator/crmTabulatorTrLocale";
import {
  applyCrmTableFilters,
  createCrmRemoteTabulatorOptions,
  createRemoteSortState,
  mapHeaderFilters,
  syncRemoteSortFromParams,
  type CrmListMeta,
  type CrmRemoteTabulatorHandle,
} from "@/shared/tabulator/crmRemoteTabulator";
import { readApiErrorMessage } from "@/shared/utils/apiErrorMessage";

export type FollowUpsDataTableHandle = CrmRemoteTabulatorHandle;

export type { CrmListMeta as FollowUpsListMeta };

type FollowUpsDataTableProps = {
  listLoader: (query: FollowUpListQuery) => Promise<FollowUpListResult>;
  canViewFollowUpDetail: boolean;
  canUpdateFollowUps: boolean;
  canViewCustomerDetail: boolean;
  onOpenFollowUpDetail: (followUp: FollowUpListItem) => void;
  onOpenEditFollowUp: (followUp: FollowUpListItem) => void;
  onOpenCustomerDetail: (customerId: number) => void;
  onError: (message: string) => void;
  onLoadMeta?: (meta: CrmListMeta) => void;
  onLoadingChange?: (isLoading: boolean) => void;
};

const sortFieldToApiMap: Record<string, NonNullable<FollowUpListQuery["sortBy"]>> = {
  title: "title",
  customerUnvan: "customer",
  assignedUserFullName: "assigned_user_full_name",
  branchName: "branch_name",
  visitDate: "visit_date",
  nextVisitDate: "next_visit_date",
  agreementReached: "agreement_reached",
};

const filterFieldMap: Record<string, keyof FollowUpListQuery> = {
  title: "title",
  customerUnvan: "customer",
  assignedUserFullName: "assignedUserFullName",
  branchName: "branchName",
  visitDate: "visitDate",
  nextVisitDate: "nextVisitDate",
};

const tableCallbacksRef = {
  onOpenFollowUpDetail: (_followUp: FollowUpListItem) => {},
  onOpenEditFollowUp: (_followUp: FollowUpListItem) => {},
  onOpenCustomerDetail: (_customerId: number) => {},
  onError: (_message: string) => {},
  onLoadMeta: (_meta: CrmListMeta) => {},
  onLoadingChange: (_isLoading: boolean) => {},
};

function sortFieldToApi(field: string): FollowUpListQuery["sortBy"] {
  return sortFieldToApiMap[field] ?? "";
}

function buildColumns(
  canViewFollowUpDetail: boolean,
  canUpdateFollowUps: boolean,
  canViewCustomerDetail: boolean,
): ColumnDefinition[] {
  return [
    {
      title: "İşlemler",
      field: "_actions",
      width: canViewFollowUpDetail && canUpdateFollowUps ? 96 : 72,
      headerSort: false,
      hozAlign: "center",
      formatter: () => {
        const buttons: string[] = [];
        if (canViewFollowUpDetail) {
          buttons.push(
            `<button type="button" class="btn btn-info btn-sm me-1" data-follow-up-view="1" aria-label="Takip kaydını görüntüle" title="Takip kaydını görüntüle"><i class="bi bi-eye-fill" aria-hidden="true"></i></button>`,
          );
        }
        if (canUpdateFollowUps) {
          buttons.push(
            `<button type="button" class="btn btn-warning btn-sm" data-follow-up-edit="1" aria-label="Takip kaydını düzenle" title="Takip kaydını düzenle"><i class="bi bi-pencil-fill" aria-hidden="true"></i></button>`,
          );
        }
        if (buttons.length === 0) {
          return `<span class="text-muted">-</span>`;
        }
        return buttons.join("");
      },
      cellClick: (event, cell) => {
        event.stopPropagation();
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }
        const row = cell.getRow().getData() as FollowUpListItem;
        if (target.closest("[data-follow-up-view]")) {
          tableCallbacksRef.onOpenFollowUpDetail(row);
          return;
        }
        if (target.closest("[data-follow-up-edit]")) {
          tableCallbacksRef.onOpenEditFollowUp(row);
        }
      },
    },
    {
      title: "Görev Başlığı",
      field: "title",
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "…",
      minWidth: 140,
      formatter: (cell) => String(cell.getValue() ?? "") || "-",
    },
    {
      title: "Müşteri",
      field: "customerUnvan",
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "…",
      minWidth: 140,
      formatter: (cell) => {
        const row = cell.getRow().getData() as FollowUpListItem;
        const label = String(cell.getValue() ?? "") || "-";
        if (!canViewCustomerDetail || !row.customerId) {
          return label;
        }
        return `<button type="button" class="btn btn-link btn-sm p-0 border-0 text-start" data-follow-up-customer="1">${label}</button>`;
      },
      cellClick: (event, cell) => {
        const target = event.target;
        if (!(target instanceof Element) || !target.closest("[data-follow-up-customer]")) {
          return;
        }
        event.stopPropagation();
        const row = cell.getRow().getData() as FollowUpListItem;
        if (row.customerId) {
          tableCallbacksRef.onOpenCustomerDetail(row.customerId);
        }
      },
    },
    {
      title: "Atanan Personel",
      field: "assignedUserFullName",
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "…",
      minWidth: 130,
      formatter: (cell) => String(cell.getValue() ?? "") || "-",
    },
    {
      title: "Müşteri Bayisi",
      field: "branchName",
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "…",
      minWidth: 120,
      formatter: (cell) => String(cell.getValue() ?? "") || "-",
    },
    {
      title: "Ziyaret Tarihi",
      field: "visitDate",
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "YYYY-MM-DD",
      sorter: "date",
      minWidth: 130,
      formatter: (cell) => formatTabulatorDate(String(cell.getValue() ?? "")),
    },
    {
      title: "Sonraki Ziyaret Tarihi",
      field: "nextVisitDate",
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "YYYY-MM-DD",
      sorter: "date",
      minWidth: 150,
      formatter: (cell) => formatTabulatorDate(String(cell.getValue() ?? "")),
    },
    {
      title: "Anlaşma Sağlandı mı?",
      field: "agreementReached",
      headerSort: true,
      sorter: "boolean",
      hozAlign: "center",
      minWidth: 150,
      formatter: (cell) => formatTabulatorAgreement(Boolean(cell.getValue())),
    },
  ];
}

export const FollowUpsDataTable = forwardRef<
  FollowUpsDataTableHandle,
  FollowUpsDataTableProps
>(function FollowUpsDataTable(
  {
    listLoader,
    canViewFollowUpDetail,
    canUpdateFollowUps,
    canViewCustomerDetail,
    onOpenFollowUpDetail,
    onOpenEditFollowUp,
    onOpenCustomerDetail,
    onError,
    onLoadMeta,
    onLoadingChange,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabulatorRef = useRef<Tabulator | null>(null);
  const listLoaderRef = useRef(listLoader);

  listLoaderRef.current = listLoader;
  tableCallbacksRef.onOpenFollowUpDetail = onOpenFollowUpDetail;
  tableCallbacksRef.onOpenEditFollowUp = onOpenEditFollowUp;
  tableCallbacksRef.onOpenCustomerDetail = onOpenCustomerDetail;
  tableCallbacksRef.onError = onError;
  tableCallbacksRef.onLoadMeta = onLoadMeta ?? (() => {});
  tableCallbacksRef.onLoadingChange = onLoadingChange ?? (() => {});

  useImperativeHandle(ref, () => ({
    applyFilters() {
      applyCrmTableFilters(tabulatorRef.current);
    },
    clearFilters() {
      tabulatorRef.current?.clearHeaderFilter();
      void tabulatorRef.current?.setPage(1);
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
    const remoteSort = createRemoteSortState("visitDate", "desc");

    const table = new Tabulator(
      element,
      createCrmRemoteTabulatorOptions({
        placeholder: "Kayıt bulunamadı.",
        ajaxURL: "follow-ups-crm",
        initialSort: { column: "visitDate", dir: "desc" },
        remoteSort,
        getTableInstance: () => tableInstance,
        columns: buildColumns(
          canViewFollowUpDetail,
          canUpdateFollowUps,
          canViewCustomerDetail,
        ),
        ajaxRequestFunc: async (_url, _config, params) => {
          tableCallbacksRef.onLoadingChange(true);

          const requestParams = params as import("@/shared/tabulator/crmRemoteTabulator").CrmRemoteTabulatorRequestParams;

          syncRemoteSortFromParams(
            requestParams.sort,
            tableInstance,
            remoteSort,
          );

          const query: FollowUpListQuery = {
            page: requestParams.page ?? 1,
            perPage: requestParams.size ?? CRM_LIST_PAGE_SIZE_OPTIONS[0],
            sortBy: sortFieldToApi(remoteSort.field),
            sortOrder: remoteSort.dir,
            ...mapHeaderFilters<FollowUpListQuery>(
              requestParams.filter,
              filterFieldMap,
            ),
          };

          try {
            const result = await listLoaderRef.current(query);
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
              readApiErrorMessage(error, "Takip kayıtları getirilemedi."),
            );
            tableCallbacksRef.onLoadMeta({ total: 0, currentPage: 1, lastPage: 1 });
            return { data: [], last_page: 1, last_row: 0 };
          } finally {
            tableCallbacksRef.onLoadingChange(false);
          }
        },
      }),
    );

    table.on("rowClick", (_event, row) => {
      if (canViewFollowUpDetail) {
        tableCallbacksRef.onOpenFollowUpDetail(row.getData() as FollowUpListItem);
      }
    });

    tableInstance = table;
    tabulatorRef.current = table;

    return () => {
      table.destroy();
      tabulatorRef.current = null;
    };
  }, [canViewFollowUpDetail, canUpdateFollowUps, canViewCustomerDetail]);

  return (
    <div
      ref={containerRef}
      className="follow-ups-tabulator crm-tabulator"
      aria-label="Tüm Takip Kayıtları"
    />
  );
});

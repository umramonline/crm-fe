import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { TabulatorFull as Tabulator, type ColumnDefinition } from "tabulator-tables";

import {
  type TaskListItem,
  type TaskListQuery,
  type TaskListResult,
  type TaskPriority,
} from "@/features/tasks/services/taskApi";
import { formatTabulatorDate } from "@/shared/tabulator/crmTabulatorFormatters";
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

export type TasksDataTableHandle = CrmRemoteTabulatorHandle;

export type { CrmListMeta as TasksListMeta };

type TasksDataTableProps = {
  listLoader: (query: TaskListQuery) => Promise<TaskListResult>;
  canViewTaskDetail: boolean;
  onOpenTaskDetail: (task: TaskListItem) => void;
  onError: (message: string) => void;
  onLoadMeta?: (meta: CrmListMeta) => void;
  onLoadingChange?: (isLoading: boolean) => void;
};

const sortFieldToApiMap: Record<string, NonNullable<TaskListQuery["sortBy"]>> = {
  title: "title",
  customerCount: "customer_count",
  assignedUserFullName: "assigned_user_full_name",
  branchName: "branch_name",
  visitDate: "visit_date",
  dueDate: "due_date",
  priority: "priority",
  createdByUserFullName: "created_by_user_full_name",
};

const filterFieldMap: Record<string, keyof TaskListQuery> = {
  title: "title",
  assignedUserFullName: "assignedUserFullName",
  branchName: "branchName",
  visitDate: "visitDate",
  dueDate: "dueDate",
  priority: "priority",
  createdByUserFullName: "createdByUserFullName",
};

const tableCallbacksRef = {
  onOpenTaskDetail: (_task: TaskListItem) => {},
  onError: (_message: string) => {},
  onLoadMeta: (_meta: CrmListMeta) => {},
  onLoadingChange: (_isLoading: boolean) => {},
};

function sortFieldToApi(field: string): TaskListQuery["sortBy"] {
  return sortFieldToApiMap[field] ?? "";
}

function formatTaskPriority(priority: TaskPriority): string {
  const priorityMap: Record<TaskPriority, string> = {
    high: "Yüksek",
    medium: "Orta",
    low: "Düşük",
  };
  return priorityMap[priority];
}

function buildColumns(canViewTaskDetail: boolean): ColumnDefinition[] {
  return [
    {
      title: "İşlemler",
      field: "_actions",
      width: 72,
      headerSort: false,
      hozAlign: "center",
      formatter: () => {
        if (!canViewTaskDetail) {
          return `<span class="text-muted">-</span>`;
        }
        return `<button type="button" class="btn btn-info btn-sm" data-task-view-detail="1" aria-label="Görev detayını görüntüle" title="Görev detayını görüntüle"><i class="bi bi-eye-fill" aria-hidden="true"></i></button>`;
      },
      cellClick: (event, cell) => {
        const target = event.target;
        if (!(target instanceof Element) || !target.closest("[data-task-view-detail]")) {
          return;
        }
        tableCallbacksRef.onOpenTaskDetail(cell.getRow().getData() as TaskListItem);
      },
    },
    {
      title: "Görev Başlığı",
      field: "title",
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "…",
      minWidth: 140,
      formatter: (cell) => String(cell.getValue() ?? "") || "Potansiyel Müşteri",
    },
    {
      title: "Müşteri Sayısı",
      field: "customerCount",
      sorter: "number",
      hozAlign: "center",
      width: 110,
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
      title: "Son Ziyaret Tarihi",
      field: "dueDate",
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "YYYY-MM-DD",
      sorter: "date",
      minWidth: 140,
      formatter: (cell) => formatTabulatorDate(String(cell.getValue() ?? "")),
    },
    {
      title: "Öncelik",
      field: "priority",
      headerFilter: "list",
      headerFilterLiveFilter: false,
      headerFilterParams: {
        values: {
          "": "Tümü",
          high: "Yüksek",
          medium: "Orta",
          low: "Düşük",
        },
        clearable: true,
      },
      minWidth: 100,
      formatter: (cell) => formatTaskPriority(cell.getValue() as TaskPriority),
    },
    {
      title: "Oluşturan",
      field: "createdByUserFullName",
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "…",
      minWidth: 120,
      formatter: (cell) => String(cell.getValue() ?? "") || "-",
    },
  ];
}

export const TasksDataTable = forwardRef<TasksDataTableHandle, TasksDataTableProps>(
  function TasksDataTable(
    {
      listLoader,
      canViewTaskDetail,
      onOpenTaskDetail,
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
    tableCallbacksRef.onOpenTaskDetail = onOpenTaskDetail;
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
          ajaxURL: "tasks-crm",
          initialSort: { column: "visitDate", dir: "desc" },
          remoteSort,
          getTableInstance: () => tableInstance,
          columns: buildColumns(canViewTaskDetail),
          ajaxRequestFunc: async (_url, _config, params) => {
            tableCallbacksRef.onLoadingChange(true);

            const requestParams = params as import("@/shared/tabulator/crmRemoteTabulator").CrmRemoteTabulatorRequestParams;

            syncRemoteSortFromParams(
              requestParams.sort,
              tableInstance,
              remoteSort,
            );

            const query: TaskListQuery = {
              page: requestParams.page ?? 1,
              perPage: requestParams.size ?? CRM_LIST_PAGE_SIZE_OPTIONS[0],
              sortBy: sortFieldToApi(remoteSort.field),
              sortOrder: remoteSort.dir,
              ...mapHeaderFilters<TaskListQuery>(
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
                readApiErrorMessage(error, "Görev listesi getirilemedi."),
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
    }, [canViewTaskDetail]);

    return (
      <div
        ref={containerRef}
        className="tasks-tabulator crm-tabulator"
        aria-label="Tüm Görevler"
      />
    );
  },
);

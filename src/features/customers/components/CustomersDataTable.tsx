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

import type { Branch, Customer, CustomerListQuery, Zone } from "@/features/customers/services/customerApi";
import { listCustomers } from "@/features/customers/services/customerApi";
import { CRM_LIST_PAGE_SIZE_OPTIONS } from "@/shared/tabulator/crmTabulatorTrLocale";
import {
  applyCrmTableFilters,
  clearCrmTableFilters,
  createCrmRemoteTabulatorOptions,
  createRemoteSortState,
  mapHeaderFilters,
  resolveRemoteHeaderFilters,
  syncRemoteSortFromParams,
  type CrmListMeta,
  type CrmRemoteTabulatorHandle,
} from "@/shared/tabulator/crmRemoteTabulator";
import { customerRowClass } from "@/shared/utils/customerRowClass";
import { readApiErrorMessage } from "@/shared/utils/apiErrorMessage";

const situationOptions = [
  "Potansiyel Müşteri",
  "Kayıp Müşteri",
  "Pasif Müşteri",
  "Yarı Aktif Müşteri",
  "Aktif Müşteri",
] as const;

const typeOptions = ["Kurumsal", "Bireysel"] as const;

export type CustomersDataTableHandle = CrmRemoteTabulatorHandle & {
  getCurrentPageCustomers: () => Customer[];
};

export type CustomersListMeta = CrmListMeta;

type CustomersDataTableProps = {
  branches: Branch[];
  zones: Zone[];
  canListBranches: boolean;
  isBranchFilterLoading: boolean;
  canListZones: boolean;
  canSelectTaskCustomers: boolean;
  canViewCustomerDetail: boolean;
  canViewFullRegistration: boolean;
  canCreateStandaloneFollowUp: boolean;
  selectedCustomerIds: Set<number>;
  areCurrentPageCustomersSelected: boolean;
  areSomeCurrentPageCustomersSelected: boolean;
  onToggleCustomer: (customer: Customer, checked: boolean) => void;
  onToggleCurrentPage: (checked: boolean, pageCustomers: Customer[]) => void;
  onOpenCustomerDetail: (customerId: number) => void;
  onOpenStandaloneFollowUp: (customer: Customer) => void;
  onNavigateFullRegistration: (customerId: number) => void;
  onFiltersApplied: (query: Partial<CustomerListQuery>) => void;
  onPageCustomersChange?: (items: Customer[]) => void;
  onError: (message: string) => void;
  onLoadMeta?: (meta: CrmListMeta) => void;
  onLoadingChange?: (isLoading: boolean) => void;
};

const sortFieldToApiMap: Record<string, NonNullable<CustomerListQuery["sortBy"]>> = {
  vehicleStockCount: "vehicle_stock_count",
  credit: "credit",
  point: "point",
  createdAt: "created_at",
};

const filterFieldMap: Record<string, keyof CustomerListQuery> = {
  situation: "situation",
  unvan: "unvan",
  cep: "cep",
  ad: "ad",
  soyad: "soyad",
  branchName: "branchName",
  zoneName: "zoneName",
  plusCardNo: "plusCardNo",
  city: "city",
  town: "town",
  createdAt: "createdAt",
  type: "type",
};

const tableCallbacksRef = {
  canSelectTaskCustomers: false,
  canViewCustomerDetail: false,
  canViewFullRegistration: false,
  canCreateStandaloneFollowUp: false,
  selectedCustomerIds: new Set<number>(),
  onToggleCustomer: (_customer: Customer, _checked: boolean) => {},
  onOpenCustomerDetail: (_customerId: number) => {},
  onOpenStandaloneFollowUp: (_customer: Customer) => {},
  onNavigateFullRegistration: (_customerId: number) => {},
  onToggleCurrentPage: (_checked: boolean, _pageCustomers: Customer[]) => {},
  onFiltersApplied: (_query: Partial<CustomerListQuery>) => {},
  onPageCustomersChange: (_items: Customer[]) => {},
  onError: (_message: string) => {},
  onLoadMeta: (_meta: CrmListMeta) => {},
  onLoadingChange: (_isLoading: boolean) => {},
};

const currentPageCustomersRef: { items: Customer[] } = { items: [] };

function sortFieldToApi(field: string): CustomerListQuery["sortBy"] {
  return sortFieldToApiMap[field] ?? "";
}

function branchListValues(branches: Branch[]): Record<string, string> {
  const values: Record<string, string> = { "": "Tümü" };
  for (const branch of branches) {
    const name = branch.name || branch.title;
    if (name) {
      values[name] = name;
    }
  }
  return values;
}

function zoneListValues(zones: Zone[]): Record<string, string> {
  const values: Record<string, string> = { "": "Tümü" };
  for (const zone of zones) {
    if (zone.name) {
      values[zone.name] = zone.name;
    }
  }
  return values;
}

function situationListValues(): Record<string, string> {
  const values: Record<string, string> = { "": "Tümü" };
  for (const option of situationOptions) {
    values[option] = option;
  }
  return values;
}

function typeListValues(): Record<string, string> {
  const values: Record<string, string> = { "": "Tümü" };
  for (const option of typeOptions) {
    values[option] = option;
  }
  return values;
}

function formatCredit(value: number): string {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(value);
}

function formatVehicleStockCount(value: number | null): string {
  if (value === null) {
    return "-";
  }
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatCustomerType(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "kurumsal") {
    return "Kurumsal";
  }
  if (normalized === "bireysel") {
    return "Bireysel";
  }
  if (!normalized || normalized === "-") {
    return "-";
  }
  return value;
}

function buildColumns(
  branches: Branch[],
  zones: Zone[],
  canListBranches: boolean,
  isBranchFilterLoading: boolean,
  canListZones: boolean,
): ColumnDefinition[] {
  return [
    {
      title: "",
      field: "_select",
      width: 44,
      headerSort: false,
      hozAlign: "center",
      cssClass: "customer-selection-cell",
      titleFormatter: () => {
        const input = document.createElement("input");
        input.type = "checkbox";
        input.className = "form-check-input";
        input.dataset.customerSelectAll = "1";
        input.setAttribute("aria-label", "Listelenen müşterileri seç");
        return input;
      },
      formatter: (cell) => {
        const row = cell.getRow().getData() as Customer;
        const checked = tableCallbacksRef.selectedCustomerIds.has(row.id);
        const disabled =
          !tableCallbacksRef.canSelectTaskCustomers || !row.id;
        return `<input type="checkbox" class="form-check-input" data-customer-select="1" aria-label="Müşteri seç"${checked ? " checked" : ""}${disabled ? " disabled" : ""} />`;
      },
      cellClick: (event, cell) => {
        event.stopPropagation();
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || !target.dataset.customerSelect) {
          return;
        }
        const customer = cell.getRow().getData() as Customer;
        tableCallbacksRef.onToggleCustomer(customer, target.checked);
      },
    },
    {
      title: "İşlemler",
      field: "_actions",
      width: 132,
      minWidth: 132,
      headerSort: false,
      hozAlign: "center",
      cssClass: "table-actions-cell",
      formatter: () => {
        const buttons: string[] = [];
        if (tableCallbacksRef.canViewCustomerDetail) {
          buttons.push(
            `<button type="button" class="btn btn-info btn-sm me-1" data-customer-view="1" aria-label="Müşteri detayını görüntüle"><i class="bi bi-eye-fill" aria-hidden="true"></i></button>`,
          );
        }
        if (tableCallbacksRef.canViewFullRegistration) {
          buttons.push(
            `<button type="button" class="btn btn-warning btn-sm me-1" data-customer-full-reg="1" aria-label="Tam kayıt"><i class="bi bi-pencil-fill" aria-hidden="true"></i></button>`,
          );
        }
        if (tableCallbacksRef.canCreateStandaloneFollowUp) {
          buttons.push(
            `<button type="button" class="btn btn-success btn-sm" data-customer-follow-up="1" aria-label="Takip kaydı"><i class="bi bi-journal-plus" aria-hidden="true"></i></button>`,
          );
        }
        return buttons.length > 0 ? buttons.join("") : `<span class="text-muted">-</span>`;
      },
      cellClick: (event, cell) => {
        event.stopPropagation();
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }
        const row = cell.getRow().getData() as Customer;
        if (!row.id) {
          return;
        }
        if (target.closest("[data-customer-view]")) {
          tableCallbacksRef.onOpenCustomerDetail(row.id);
          return;
        }
        if (target.closest("[data-customer-full-reg]")) {
          tableCallbacksRef.onNavigateFullRegistration(row.id);
          return;
        }
        if (target.closest("[data-customer-follow-up]")) {
          tableCallbacksRef.onOpenStandaloneFollowUp(row);
        }
      },
    },
    {
      title: "Durum",
      field: "situation",
      headerSort: false,
      headerFilter: "list",
      headerFilterLiveFilter: false,
      headerFilterParams: { values: situationListValues(), clearable: true },
      minWidth: 130,
      formatter: (cell) => String(cell.getValue() ?? "") || "-",
    },
    {
      title: "Firma İsmi",
      field: "unvan",
      headerSort: false,
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "…",
      minWidth: 140,
      formatter: (cell) => String(cell.getValue() ?? "") || "-",
    },
    {
      title: "Yetkili Telefonu",
      field: "cep",
      headerSort: false,
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "…",
      minWidth: 120,
      formatter: (cell) => String(cell.getValue() ?? "") || "-",
    },
    {
      title: "Yetkili İsmi",
      field: "ad",
      headerSort: false,
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "…",
      minWidth: 110,
      formatter: (cell) => String(cell.getValue() ?? "") || "-",
    },
    {
      title: "Yetkili Soyismi",
      field: "soyad",
      headerSort: false,
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "…",
      minWidth: 110,
      formatter: (cell) => String(cell.getValue() ?? "") || "-",
    },
    {
      title: "Araç Stok Adedi",
      field: "vehicleStockCount",
      sorter: "number",
      minWidth: 120,
      hozAlign: "right",
      formatter: (cell) =>
        formatVehicleStockCount(cell.getValue() as number | null),
    },
    {
      title: "Bayi",
      field: "branchName",
      headerSort: false,
      headerFilter: "list",
      headerFilterLiveFilter: false,
      headerFilterParams: {
        values: branchListValues(branches),
        clearable: true,
      },
      minWidth: 120,
      formatter: (cell) => String(cell.getValue() ?? "") || "-",
    },
    {
      title: "Bölge",
      field: "zoneName",
      headerSort: false,
      headerFilter: "list",
      headerFilterLiveFilter: false,
      headerFilterParams: { values: zoneListValues(zones), clearable: true },
      minWidth: 110,
      formatter: (cell) => String(cell.getValue() ?? "") || "-",
    },
    {
      title: "Plus Card No",
      field: "plusCardNo",
      headerSort: false,
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "…",
      minWidth: 120,
      formatter: (cell) => String(cell.getValue() ?? "") || "-",
    },
    {
      title: "Kredi Bakiyesi",
      field: "credit",
      sorter: "number",
      minWidth: 120,
      hozAlign: "right",
      formatter: (cell) => formatCredit(Number(cell.getValue() ?? 0)),
    },
    {
      title: "Puan Bakiyesi",
      field: "point",
      sorter: "number",
      minWidth: 120,
      hozAlign: "right",
      formatter: (cell) => formatCredit(Number(cell.getValue() ?? 0)),
    },
    {
      title: "İl",
      field: "city",
      headerSort: false,
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "…",
      minWidth: 90,
      formatter: (cell) => String(cell.getValue() ?? "") || "-",
    },
    {
      title: "İlçe",
      field: "town",
      headerSort: false,
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "…",
      minWidth: 90,
      formatter: (cell) => String(cell.getValue() ?? "") || "-",
    },
    {
      title: "Kayıt Tarihi",
      field: "createdAt",
      sorter: "datetime",
      headerFilter: "input",
      headerFilterLiveFilter: false,
      headerFilterPlaceholder: "YYYY-MM-DD",
      minWidth: 140,
      formatter: (cell) => formatDate(String(cell.getValue() ?? "")),
    },
    {
      title: "Müşteri Türü",
      field: "type",
      headerSort: false,
      headerFilter: "list",
      headerFilterLiveFilter: false,
      headerFilterParams: { values: typeListValues(), clearable: true },
      minWidth: 110,
      formatter: (cell) => formatCustomerType(String(cell.getValue() ?? "")),
    },
  ];
}

export const CustomersDataTable = forwardRef<
  CustomersDataTableHandle,
  CustomersDataTableProps
>(function CustomersDataTable(props, ref) {
  const {
    branches,
    zones,
    canListBranches,
    isBranchFilterLoading,
    canListZones,
    canSelectTaskCustomers,
    canViewCustomerDetail,
    canViewFullRegistration,
    canCreateStandaloneFollowUp,
    selectedCustomerIds,
    areCurrentPageCustomersSelected,
    areSomeCurrentPageCustomersSelected,
    onToggleCustomer,
    onToggleCurrentPage,
    onOpenCustomerDetail,
    onOpenStandaloneFollowUp,
    onNavigateFullRegistration,
    onFiltersApplied,
    onPageCustomersChange,
    onError,
    onLoadMeta,
    onLoadingChange,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const tabulatorRef = useRef<Tabulator | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  tableCallbacksRef.canSelectTaskCustomers = canSelectTaskCustomers;
  tableCallbacksRef.canViewCustomerDetail = canViewCustomerDetail;
  tableCallbacksRef.canViewFullRegistration = canViewFullRegistration;
  tableCallbacksRef.canCreateStandaloneFollowUp = canCreateStandaloneFollowUp;
  tableCallbacksRef.selectedCustomerIds = selectedCustomerIds;
  tableCallbacksRef.onToggleCustomer = onToggleCustomer;
  tableCallbacksRef.onToggleCurrentPage = onToggleCurrentPage;
  tableCallbacksRef.onOpenCustomerDetail = onOpenCustomerDetail;
  tableCallbacksRef.onOpenStandaloneFollowUp = onOpenStandaloneFollowUp;
  tableCallbacksRef.onNavigateFullRegistration = onNavigateFullRegistration;
  tableCallbacksRef.onFiltersApplied = onFiltersApplied;
  tableCallbacksRef.onPageCustomersChange = onPageCustomersChange ?? (() => {});
  tableCallbacksRef.onError = onError;
  tableCallbacksRef.onLoadMeta = onLoadMeta ?? (() => {});
  tableCallbacksRef.onLoadingChange = onLoadingChange ?? (() => {});

  useImperativeHandle(ref, () => ({
    applyFilters() {
      applyCrmTableFilters(tabulatorRef.current);
    },
    clearFilters() {
      clearCrmTableFilters(tabulatorRef.current);
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
    getCurrentPageCustomers() {
      return currentPageCustomersRef.items;
    },
  }));

  useEffect(() => {
    tabulatorRef.current?.redraw(true);
  }, [selectedCustomerIds, canSelectTaskCustomers]);

  useEffect(() => {
    const headerInput = selectAllRef.current;
    if (!headerInput) {
      return;
    }
    headerInput.checked = areCurrentPageCustomersSelected;
    headerInput.indeterminate = areSomeCurrentPageCustomersSelected;
    headerInput.disabled =
      !canSelectTaskCustomers || currentPageCustomersRef.items.length === 0;
  }, [
    areCurrentPageCustomersSelected,
    areSomeCurrentPageCustomersSelected,
    canSelectTaskCustomers,
    selectedCustomerIds,
  ]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    let tableInstance: Tabulator | null = null;
    const remoteSort = createRemoteSortState("createdAt", "desc");

    const table = new Tabulator(element, {
      ...createCrmRemoteTabulatorOptions({
        placeholder: "Kayıt bulunamadı.",
        ajaxURL: "customers-crm",
        initialSort: { column: "createdAt", dir: "desc" },
        responsiveLayout: false,
        remoteSort,
        getTableInstance: () => tableInstance,
        columns: buildColumns(
          branches,
          zones,
          canListBranches,
          isBranchFilterLoading,
          canListZones,
        ),
        ajaxRequestFunc: async (_url, _config, params) => {
          tableCallbacksRef.onLoadingChange(true);

          const requestParams = params as import("@/shared/tabulator/crmRemoteTabulator").CrmRemoteTabulatorRequestParams;

          syncRemoteSortFromParams(
            requestParams.sort,
            tableInstance,
            remoteSort,
          );

          const query: CustomerListQuery = {
            page: requestParams.page ?? 1,
            perPage: requestParams.size ?? CRM_LIST_PAGE_SIZE_OPTIONS[0],
            sortBy: sortFieldToApi(remoteSort.field),
            sortOrder: remoteSort.dir,
            ...mapHeaderFilters<CustomerListQuery>(
              resolveRemoteHeaderFilters(tableInstance, requestParams.filter),
              filterFieldMap,
            ),
          };

          tableCallbacksRef.onFiltersApplied(query);

          try {
            const result = await listCustomers(query);
            currentPageCustomersRef.items = result.items;
            tableCallbacksRef.onPageCustomersChange(result.items);

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
            currentPageCustomersRef.items = [];
            tableCallbacksRef.onPageCustomersChange([]);
            tableCallbacksRef.onError(
              readApiErrorMessage(error, "Müşteri listesi getirilemedi."),
            );
            tableCallbacksRef.onLoadMeta({ total: 0, currentPage: 1, lastPage: 1 });
            return { data: [], last_page: 1, last_row: 0 };
          } finally {
            tableCallbacksRef.onLoadingChange(false);
          }
        },
      }),
      rowFormatter(row) {
        const data = row.getData() as Customer;
        const rowClass = customerRowClass(data.situation);
        const rowElement = row.getElement();
        rowElement.classList.remove("table-success", "table-warning", "table-danger");
        if (rowClass) {
          rowElement.classList.add(rowClass);
        }
      },
    });

    table.on("tableBuilt", () => {
      selectAllRef.current = element.querySelector<HTMLInputElement>(
        "[data-customer-select-all]",
      );
      const headerInput = selectAllRef.current;
      if (!headerInput) {
        return;
      }
      headerInput.addEventListener("change", () => {
        tableCallbacksRef.onToggleCurrentPage(
          headerInput.checked,
          currentPageCustomersRef.items,
        );
      });
    });

    tableInstance = table;
    tabulatorRef.current = table;

    return () => {
      selectAllRef.current = null;
      table.destroy();
      tabulatorRef.current = null;
      currentPageCustomersRef.items = [];
    };
  }, [
    branches,
    zones,
    canListBranches,
    isBranchFilterLoading,
    canListZones,
    canViewCustomerDetail,
    canViewFullRegistration,
    canCreateStandaloneFollowUp,
  ]);

  return (
    <div
      ref={containerRef}
      className="customers-tabulator crm-tabulator"
      aria-label="Galeri Listesi"
    />
  );
});

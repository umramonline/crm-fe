import type { Options } from "tabulator-tables";
import type { Tabulator } from "tabulator-tables";

import {
  CRM_LIST_PAGE_SIZE_OPTIONS,
  crmTabulatorTurkishLangs,
} from "@/shared/tabulator/crmTabulatorTrLocale";
import {
  createRemoteSortState,
  syncRemoteSortFromParams,
  type RemoteSortState,
  type TabulatorSortParam,
} from "@/shared/tabulator/remoteSort";

export type CrmListMeta = {
  total: number;
  currentPage: number;
  lastPage: number;
};

export type CrmRemoteTabulatorHandle = {
  applyFilters: () => void;
  clearFilters: () => void;
  downloadCsv: (filename: string) => void;
  downloadJson: (filename: string) => void;
  refresh: () => void;
};

export type CrmRemoteTabulatorRequestParams = {
  page?: number;
  size?: number;
  sort?: TabulatorSortParam[];
  filter?: Array<{ field: string; value: unknown }>;
};

/** Push current header filter input values into Tabulator state before remote reload (Filtrele). */
export function commitPendingHeaderFilters(table: Tabulator | null): void {
  if (!table) {
    return;
  }

  for (const column of table.getColumns()) {
    const field = column.getField();
    if (!field || field.startsWith("_")) {
      continue;
    }

    if (!column.getDefinition().headerFilter) {
      continue;
    }

    const filterRoot = column.getElement()?.querySelector(".tabulator-header-filter");
    if (!filterRoot) {
      continue;
    }

    const control = filterRoot.querySelector("input, select");
    if (
      !(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)
    ) {
      continue;
    }

    table.setHeaderFilterValue(column, control.value);
  }
}

export function applyCrmTableFilters(table: Tabulator | null): void {
  commitPendingHeaderFilters(table);
  void table?.setPage(1);
}

export function mapHeaderFilters<T extends Record<string, unknown>>(
  filters: CrmRemoteTabulatorRequestParams["filter"],
  fieldMap: Record<string, keyof T>,
): Partial<T> {
  const query: Partial<T> = {};

  for (const filter of filters ?? []) {
    const key = fieldMap[filter.field];
    const value = String(filter.value ?? "").trim();
    if (key && value) {
      (query as Record<string, string>)[key as string] = value;
    }
  }

  return query;
}

export type CreateCrmRemoteTabulatorOptionsInput = {
  placeholder: string;
  ajaxURL: string;
  columns: Options["columns"];
  initialSort: { column: string; dir: "asc" | "desc" };
  remoteSort: RemoteSortState;
  getTableInstance: () => Tabulator | null;
  ajaxRequestFunc: Options["ajaxRequestFunc"];
};

export function createCrmRemoteTabulatorOptions(
  input: CreateCrmRemoteTabulatorOptionsInput,
): Options {
  const { remoteSort, getTableInstance } = input;

  return {
    layout: "fitColumns",
    responsiveLayout: "collapse",
    placeholder: input.placeholder,
    dataLoader: false,
    pagination: true,
    paginationMode: "remote",
    paginationSize: CRM_LIST_PAGE_SIZE_OPTIONS[0],
    paginationSizeSelector: [...CRM_LIST_PAGE_SIZE_OPTIONS],
    paginationInitialPage: 1,
    paginationCounter: "rows",
    sortMode: "remote",
    filterMode: "remote",
    columnHeaderSortMulti: false,
    headerSortClickElement: "icon",
    initialSort: [{ column: input.initialSort.column, dir: input.initialSort.dir }],
    headerFilterLiveFilterDelay: 86400000,
    ajaxURL: input.ajaxURL,
    ajaxRequesting: (_url, params) => {
      syncRemoteSortFromParams(
        params.sort as TabulatorSortParam[] | undefined,
        getTableInstance(),
        remoteSort,
      );
      return true;
    },
    ajaxRequestFunc: input.ajaxRequestFunc,
    columns: input.columns,
    locale: "tr",
    langs: crmTabulatorTurkishLangs,
  };
}

export { createRemoteSortState, syncRemoteSortFromParams };
export type { RemoteSortState, TabulatorSortParam };

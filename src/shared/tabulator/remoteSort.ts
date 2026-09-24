import type { Tabulator } from "tabulator-tables";

export type RemoteSortState = {
  field: string;
  dir: "asc" | "desc";
};

export type TabulatorSortParam = {
  field?: string;
  dir?: "asc" | "desc" | "none";
};

export function createRemoteSortState(
  field: string,
  dir: "asc" | "desc",
): RemoteSortState {
  return { field, dir };
}

/** Sync sort state from Tabulator ajax params (call in ajaxRequesting / start of ajaxRequestFunc). */
export function syncRemoteSortFromParams(
  requestSort: TabulatorSortParam[] | undefined,
  table: Tabulator | null,
  state: RemoteSortState,
): void {
  const fromRequest = requestSort?.filter(
    (item) => item.field && item.dir && item.dir !== "none",
  );
  const active =
    fromRequest && fromRequest.length > 0
      ? fromRequest
      : (table?.getSorters() ?? []).filter((item) => item.field && item.dir);

  const first = active[0];
  if (!first?.field || !first.dir || first.dir === "none") {
    return;
  }

  state.field = first.field;
  state.dir = first.dir === "asc" ? "asc" : "desc";
}

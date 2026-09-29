import { describe, expect, it, vi } from "vitest";

import {
  commitPendingHeaderFilters,
  mapHeaderFilters,
  triggerRemoteFilterReload,
} from "@/shared/tabulator/crmRemoteTabulator";

describe("commitPendingHeaderFilters", () => {
  it("reads DOM values and calls setHeaderFilterValue", () => {
    const input = document.createElement("input");
    input.value = "Acme";

    const filterRoot = document.createElement("div");
    filterRoot.className = "tabulator-header-filter";
    filterRoot.appendChild(input);

    const columnEl = document.createElement("div");
    columnEl.appendChild(filterRoot);

    const setHeaderFilterValue = vi.fn();
    const column = {
      getField: () => "title",
      getDefinition: () => ({ headerFilter: "input" }),
      getElement: () => columnEl,
    };

    commitPendingHeaderFilters({
      getColumns: () => [column],
      setHeaderFilterValue,
    } as never);

    expect(setHeaderFilterValue).toHaveBeenCalledWith(column, "Acme");
  });
});

describe("triggerRemoteFilterReload", () => {
  it("calls refreshFilter when already on page 1", () => {
    const refreshFilter = vi.fn();
    const setPage = vi.fn();

    triggerRemoteFilterReload({
      getPage: () => 1,
      setPage,
      refreshFilter,
    } as never);

    expect(refreshFilter).toHaveBeenCalledTimes(1);
    expect(setPage).not.toHaveBeenCalled();
  });

  it("calls setPage(1) when on another page", () => {
    const refreshFilter = vi.fn();
    const setPage = vi.fn();

    triggerRemoteFilterReload({
      getPage: () => 3,
      setPage,
      refreshFilter,
    } as never);

    expect(setPage).toHaveBeenCalledWith(1);
    expect(refreshFilter).not.toHaveBeenCalled();
  });
});

describe("mapHeaderFilters", () => {
  it("maps customer gallery filter fields and skips empty values", () => {
    const fieldMap = {
      situation: "situation",
      unvan: "unvan",
      branchName: "branchName",
    } as const;

    expect(
      mapHeaderFilters(
        [
          { field: "situation", value: "Aktif Müşteri" },
          { field: "unvan", value: "  Acme " },
          { field: "branchName", value: "" },
          { field: "_select", value: "1" },
        ],
        fieldMap,
      ),
    ).toEqual({
      situation: "Aktif Müşteri",
      unvan: "Acme",
    });
  });

  it("skips Tümü list filter placeholder values", () => {
    expect(
      mapHeaderFilters(
        [
          { field: "situation", value: "Tümü" },
          { field: "branchName", value: "Tümü" },
          { field: "cep", value: "05537" },
        ],
        {
          situation: "situation",
          branchName: "branchName",
          cep: "cep",
        },
      ),
    ).toEqual({ cep: "05537" });
  });
});

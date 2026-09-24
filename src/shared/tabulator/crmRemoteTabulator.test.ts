import { describe, expect, it, vi } from "vitest";

import { commitPendingHeaderFilters } from "@/shared/tabulator/crmRemoteTabulator";

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

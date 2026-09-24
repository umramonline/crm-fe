import { describe, expect, it } from "vitest";

import {
  createRemoteSortState,
  syncRemoteSortFromParams,
} from "@/shared/tabulator/remoteSort";

describe("syncRemoteSortFromParams", () => {
  it("updates state from request sort params", () => {
    const state = createRemoteSortState("createdAt", "desc");

    syncRemoteSortFromParams(
      [{ field: "companyName", dir: "asc" }],
      null,
      state,
    );

    expect(state).toEqual({ field: "companyName", dir: "asc" });
  });

  it("ignores none direction and keeps previous state", () => {
    const state = createRemoteSortState("createdAt", "desc");

    syncRemoteSortFromParams(
      [{ field: "companyName", dir: "none" }],
      null,
      state,
    );

    expect(state).toEqual({ field: "createdAt", dir: "desc" });
  });

  it("falls back to getSorters when request sort is empty", () => {
    const state = createRemoteSortState("createdAt", "desc");
    const table = {
      getSorters: () => [{ field: "city", dir: "desc" as const }],
    };

    syncRemoteSortFromParams([], table as never, state);

    expect(state).toEqual({ field: "city", dir: "desc" });
  });
});

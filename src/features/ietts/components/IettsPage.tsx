import { FormEvent, useEffect, useMemo, useState } from "react";

import type { Permission } from "@/features/auth/services/authApi";
import { ConvertIettsToCustomerModal } from "@/features/ietts/components/ConvertIettsToCustomerModal";
import { iettsTexts } from "@/features/ietts/constants/iettsTexts";
import {
  listIettsRecords,
  type IettsListQuery,
  type IettsRecord,
} from "@/features/ietts/services/iettsApi";

type IettsPageProps = {
  permissions: Permission[];
};

type IettsFilters = {
  documentNumber: string;
  companyName: string;
  businessName: string;
  businessAddress: string;
  documentIssueDate: string;
  documentStatus: string;
  city: string;
  district: string;
  createdAt: string;
};

function createEmptyFilters(): IettsFilters {
  return {
    documentNumber: "",
    companyName: "",
    businessName: "",
    businessAddress: "",
    documentIssueDate: "",
    documentStatus: "",
    city: "",
    district: "",
    createdAt: "",
  };
}

function filtersAreEmpty(filters: IettsFilters): boolean {
  return Object.values(filters).every((value) => value.trim() === "");
}

export function IettsPage({ permissions }: IettsPageProps) {
  const permissionNames = useMemo(
    () => new Set(permissions.map((permission) => permission.name)),
    [permissions],
  );
  const canListIetts = permissionNames.has("ietts.list");
  const canConvertToCustomer = permissionNames.has("ietts.convert_to_customer");

  const [draftFilters, setDraftFilters] =
    useState<IettsFilters>(createEmptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<IettsFilters>(createEmptyFilters);
  const [items, setItems] = useState<IettsRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<IettsListQuery["sortBy"]>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [convertTargetUuid, setConvertTargetUuid] = useState<string | null>(null);

  useEffect(() => {
    if (!canListIetts) {
      setItems([]);
      setTotal(0);
      setLastPage(1);
      return;
    }

    let isActive = true;

    async function loadIettsRecords(): Promise<void> {
      setIsLoading(true);
      setMessage("");

      try {
        const result = await listIettsRecords({
          page: currentPage,
          perPage: 20,
          documentNumber: appliedFilters.documentNumber,
          companyName: appliedFilters.companyName,
          businessName: appliedFilters.businessName,
          businessAddress: appliedFilters.businessAddress,
          documentIssueDate: appliedFilters.documentIssueDate,
          documentStatus: appliedFilters.documentStatus,
          city: appliedFilters.city,
          district: appliedFilters.district,
          createdAt: appliedFilters.createdAt,
          sortBy,
          sortOrder,
        });

        if (isActive) {
          setItems(result.items);
          setCurrentPage(result.pagination.currentPage || 1);
          setLastPage(result.pagination.lastPage || 1);
          setTotal(result.pagination.total || 0);
        }
      } catch {
        if (isActive) {
          setItems([]);
          setTotal(0);
          setLastPage(1);
          setMessage(iettsTexts.loadFailed);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadIettsRecords();

    return () => {
      isActive = false;
    };
  }, [appliedFilters, canListIetts, currentPage, sortBy, sortOrder]);

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setCurrentPage(1);
    setAppliedFilters({ ...draftFilters });
  }

  function handleResetFilters(): void {
    const shouldClearDraftFilters = !filtersAreEmpty(draftFilters);
    const shouldClearAppliedFilters = !filtersAreEmpty(appliedFilters);
    const shouldResetPagination = currentPage !== 1;
    const shouldResetSort = sortBy !== "" || sortOrder !== "desc";

    if (
      !shouldClearDraftFilters &&
      !shouldClearAppliedFilters &&
      !shouldResetPagination &&
      !shouldResetSort
    ) {
      return;
    }

    if (shouldClearDraftFilters) {
      setDraftFilters(createEmptyFilters());
    }

    if (shouldClearAppliedFilters) {
      setAppliedFilters(createEmptyFilters());
    }

    if (shouldResetPagination) {
      setCurrentPage(1);
    }

    if (shouldResetSort) {
      setSortBy("");
      setSortOrder("desc");
    }

    if (message) {
      setMessage("");
    }
  }

  function handleSort(nextSortBy: IettsListQuery["sortBy"]): void {
    if (!nextSortBy) {
      return;
    }

    setCurrentPage(1);
    if (sortBy === nextSortBy) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(nextSortBy);
    setSortOrder("asc");
  }

  function updateDraftFilter<K extends keyof IettsFilters>(
    field: K,
    value: IettsFilters[K],
  ): void {
    setDraftFilters((current) => ({ ...current, [field]: value }));
  }

  if (!canListIetts) {
    return (
      <section className="panel-card permission-table-panel">
        <p className="form-message">{iettsTexts.noPermission}</p>
      </section>
    );
  }

  return (
    <section className="panel-card permission-table-panel">
      <form className="customer-filter-form" onSubmit={handleFilterSubmit}>
        <div className="customer-filter-actions">
          <h1>{iettsTexts.pageTitle}</h1>
          <button className="blue-button" type="submit">
            {iettsTexts.searchButton}
          </button>
          <button
            className="gray-button"
            type="button"
            onClick={handleResetFilters}
          >
            {iettsTexts.clearButton}
          </button>
          <p className="muted-text">{iettsTexts.totalLabel(total)}</p>
        </div>

        {message ? <p className="form-message">{message}</p> : null}

        <div className="permission-table-scroll">
          <table className="permission-table customer-table">
            <thead>
              <tr>
                {canConvertToCustomer ? (
                  <th>{iettsTexts.columns.actions}</th>
                ) : null}
                <th>{iettsTexts.columns.documentNumber}</th>
                <th>{iettsTexts.columns.companyName}</th>
                <th>{iettsTexts.columns.businessName}</th>
                <th>{iettsTexts.columns.businessAddress}</th>
                <th>
                  <button
                    className="table-sort-button"
                    type="button"
                    onClick={() => handleSort("document_issue_date")}
                  >
                    {iettsTexts.columns.documentIssueDate}{" "}
                    {sortIndicator("document_issue_date", sortBy, sortOrder)}
                  </button>
                </th>
                <th>{iettsTexts.columns.documentStatus}</th>
                <th>{iettsTexts.columns.city}</th>
                <th>{iettsTexts.columns.district}</th>
                <th>
                  <button
                    className="table-sort-button"
                    type="button"
                    onClick={() => handleSort("created_at")}
                  >
                    {iettsTexts.columns.createdAt}{" "}
                    {sortIndicator("created_at", sortBy, sortOrder)}
                  </button>
                </th>
              </tr>
              <tr className="customer-filter-row">
                {canConvertToCustomer ? <th /> : null}
                <th>
                  <input
                    className="panel-input"
                    type="text"
                    value={draftFilters.documentNumber}
                    onChange={(event) =>
                      updateDraftFilter("documentNumber", event.target.value)
                    }
                  />
                </th>
                <th>
                  <input
                    className="panel-input"
                    type="text"
                    value={draftFilters.companyName}
                    onChange={(event) =>
                      updateDraftFilter("companyName", event.target.value)
                    }
                  />
                </th>
                <th>
                  <input
                    className="panel-input"
                    type="text"
                    value={draftFilters.businessName}
                    onChange={(event) =>
                      updateDraftFilter("businessName", event.target.value)
                    }
                  />
                </th>
                <th>
                  <input
                    className="panel-input"
                    type="text"
                    value={draftFilters.businessAddress}
                    onChange={(event) =>
                      updateDraftFilter("businessAddress", event.target.value)
                    }
                  />
                </th>
                <th>
                  <input
                    className="panel-input"
                    type="text"
                    value={draftFilters.documentIssueDate}
                    onChange={(event) =>
                      updateDraftFilter("documentIssueDate", event.target.value)
                    }
                  />
                </th>
                <th>
                  <input
                    className="panel-input"
                    type="text"
                    value={draftFilters.documentStatus}
                    onChange={(event) =>
                      updateDraftFilter("documentStatus", event.target.value)
                    }
                  />
                </th>
                <th>
                  <input
                    className="panel-input"
                    type="text"
                    value={draftFilters.city}
                    onChange={(event) =>
                      updateDraftFilter("city", event.target.value)
                    }
                  />
                </th>
                <th>
                  <input
                    className="panel-input"
                    type="text"
                    value={draftFilters.district}
                    onChange={(event) =>
                      updateDraftFilter("district", event.target.value)
                    }
                  />
                </th>
                <th>
                  <input
                    className="panel-input"
                    type="text"
                    value={draftFilters.createdAt}
                    onChange={(event) =>
                      updateDraftFilter("createdAt", event.target.value)
                    }
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((record, index) => (
                  <tr key={record.uuid || `${record.documentNumber}-${index}`}>
                    {canConvertToCustomer ? (
                      <td>
                        <div className="customer-action-group">
                          <button
                            className="customer-action-button"
                            type="button"
                            aria-label={iettsTexts.convertToCustomer}
                            title={iettsTexts.convertToCustomer}
                            disabled={!record.uuid}
                            onClick={() => setConvertTargetUuid(record.uuid)}
                          >
                            ⇢
                          </button>
                        </div>
                      </td>
                    ) : null}
                    <td>{record.documentNumber || "-"}</td>
                    <td>{record.companyName || "-"}</td>
                    <td>{record.businessName || "-"}</td>
                    <td>{record.businessAddress || "-"}</td>
                    <td>{formatDate(record.documentIssueDate)}</td>
                    <td>{record.documentStatus || "-"}</td>
                    <td>{record.city || "-"}</td>
                    <td>{record.district || "-"}</td>
                    <td>{formatDateTime(record.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canConvertToCustomer ? 10 : 9}>
                    {isLoading ? iettsTexts.loading : iettsTexts.noRecords}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </form>

      <div className="customer-pagination">
        <button
          className="gray-button"
          type="button"
          disabled={currentPage <= 1 || isLoading}
          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
        >
          {iettsTexts.previousPage}
        </button>
        <span className="muted-text">
          {iettsTexts.pageLabel(currentPage, lastPage)}
        </span>
        <button
          className="gray-button"
          type="button"
          disabled={currentPage >= lastPage || isLoading}
          onClick={() =>
            setCurrentPage((page) => Math.min(lastPage, page + 1))
          }
        >
          {iettsTexts.nextPage}
        </button>
      </div>

      {convertTargetUuid ? (
        <ConvertIettsToCustomerModal
          recordUuid={convertTargetUuid}
          onClose={() => setConvertTargetUuid(null)}
          onError={(errorMessage) => setMessage(errorMessage)}
        />
      ) : null}
    </section>
  );
}

function sortIndicator(
  column: IettsListQuery["sortBy"],
  sortBy: IettsListQuery["sortBy"],
  sortOrder: "asc" | "desc",
): string {
  if (column !== sortBy) {
    return "";
  }

  return sortOrder === "asc" ? "↑" : "↓";
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

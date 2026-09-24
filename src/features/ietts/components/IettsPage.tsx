import { FormEvent, useCallback, useMemo, useRef, useState } from "react";

import type { Permission } from "@/features/auth/services/authApi";
import { ConvertIettsToCustomerModal } from "@/features/ietts/components/ConvertIettsToCustomerModal";
import {
  IettsDataTable,
  type IettsDataTableHandle,
  type IettsListMeta,
} from "@/features/ietts/components/IettsDataTable";
import { iettsTexts } from "@/features/ietts/constants/iettsTexts";
import { ContentHeader } from "@/shared/components/ContentHeader";
import { ListTableToolbar } from "@/shared/components";
import { navigateToFullRegistration } from "@/shared/utils/navigation";

type IettsPageProps = {
  permissions: Permission[];
};

const emptyListMeta: IettsListMeta = {
  total: 0,
  currentPage: 1,
  lastPage: 1,
};

export function IettsPage({ permissions }: IettsPageProps) {
  const permissionNames = useMemo(
    () => new Set(permissions.map((permission) => permission.name)),
    [permissions],
  );
  const canListIetts = permissionNames.has("ietts.list");
  const canConvertToCustomer = permissionNames.has("ietts.convert_to_customer");

  const tableRef = useRef<IettsDataTableHandle>(null);
  const [message, setMessage] = useState("");
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [listMeta, setListMeta] = useState<IettsListMeta>(emptyListMeta);
  const [convertTargetUuid, setConvertTargetUuid] = useState<string | null>(null);

  const handleTableError = useCallback((errorMessage: string) => {
    setMessage(errorMessage);
  }, []);

  const handleLoadMeta = useCallback((meta: IettsListMeta) => {
    setListMeta(meta);
  }, []);

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setMessage("");
    tableRef.current?.applyFilters();
  }

  function handleResetFilters(): void {
    setMessage("");
    tableRef.current?.clearFilters();
  }

  if (!canListIetts) {
    return (
      <>
        <ContentHeader
          title={iettsTexts.pageTitle}
          breadcrumbs={[
            { label: "Ana Sayfa", href: "/home" },
            { label: iettsTexts.pageTitle, active: true },
          ]}
        />
        <div className="card mb-3">
          <div className="card-body">
            <p className="mb-0">{iettsTexts.noPermission}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ContentHeader
        title={iettsTexts.pageTitle}
        breadcrumbs={[
          { label: "Ana Sayfa", href: "/home" },
          { label: iettsTexts.pageTitle, active: true },
        ]}
      />

      <div className="card list-table-card mb-3">
        <form className="customer-filter-form" onSubmit={handleFilterSubmit}>
          <ListTableToolbar>
            <button
              className="btn btn-primary btn-sm"
              type="submit"
              disabled={isTableLoading}
            >
              {iettsTexts.searchButton}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              disabled={isTableLoading}
              onClick={handleResetFilters}
            >
              {iettsTexts.clearButton}
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              disabled={isTableLoading}
              onClick={() => tableRef.current?.downloadCsv("ietts.csv")}
            >
              {iettsTexts.exportCsv}
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              disabled={isTableLoading}
              onClick={() => tableRef.current?.downloadJson("ietts.json")}
            >
              {iettsTexts.exportJson}
            </button>
            <span className="text-muted small ms-auto d-none d-md-inline">
              {iettsTexts.exportCurrentPageHint}
            </span>
          </ListTableToolbar>

          <p className="text-muted small d-md-none mb-0 px-3 pt-0 pb-2">
            {iettsTexts.exportCurrentPageHint}
          </p>

          {message ? (
            <div className="card-body pb-0">
              <div className="alert alert-danger py-2 mb-0" role="alert">
                {message}
              </div>
            </div>
          ) : null}

          <div className="card-body p-0">
            <IettsDataTable
              ref={tableRef}
              canConvertToCustomer={canConvertToCustomer}
              onConvert={setConvertTargetUuid}
              onViewCustomer={navigateToFullRegistration}
              onError={handleTableError}
              onLoadMeta={handleLoadMeta}
              onLoadingChange={setIsTableLoading}
            />
          </div>

          <div
            className={`card-footer list-table-footer py-2${isTableLoading ? " list-table-footer--loading" : ""}`}
          >
            <span className="text-muted small list-table-footer-summary">
              Toplam <strong>{listMeta.total}</strong> kayıt
              <span className="mx-1" aria-hidden="true">
                ·
              </span>
              Sayfa {listMeta.currentPage} / {Math.max(1, listMeta.lastPage)}
            </span>
          </div>
        </form>
      </div>

      {convertTargetUuid ? (
        <ConvertIettsToCustomerModal
          recordUuid={convertTargetUuid}
          onClose={() => setConvertTargetUuid(null)}
          onError={handleTableError}
        />
      ) : null}
    </>
  );
}

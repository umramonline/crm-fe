import { FormEvent, useMemo, useRef, useState } from "react";

import type { Permission } from "@/features/auth/services/authApi";
import { ConvertIettsToCustomerModal } from "@/features/ietts/components/ConvertIettsToCustomerModal";
import {
  IettsDataTable,
  type IettsDataTableHandle,
} from "@/features/ietts/components/IettsDataTable";
import { iettsTexts } from "@/features/ietts/constants/iettsTexts";
import { ContentHeader } from "@/shared/components/ContentHeader";
import { ListTableToolbar } from "@/shared/components";

type IettsPageProps = {
  permissions: Permission[];
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
  const [convertTargetUuid, setConvertTargetUuid] = useState<string | null>(null);

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
      <div className="card">
        <div className="card-body">
          <p className="mb-0">{iettsTexts.noPermission}</p>
        </div>
      </div>
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
            <button className="btn btn-primary btn-sm" type="submit">
              {iettsTexts.searchButton}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={handleResetFilters}
            >
              {iettsTexts.clearButton}
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={() => tableRef.current?.downloadCsv()}
            >
              {iettsTexts.exportCsv}
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={() => tableRef.current?.downloadJson()}
            >
              {iettsTexts.exportJson}
            </button>
          </ListTableToolbar>

          {message ? (
            <div className="card-body pb-0">
              <div className="alert alert-danger py-2 mb-0">{message}</div>
            </div>
          ) : null}

          <div className="card-body p-0">
            <IettsDataTable
              ref={tableRef}
              canConvertToCustomer={canConvertToCustomer}
              onConvert={setConvertTargetUuid}
              onError={setMessage}
            />
          </div>
        </form>
      </div>

      {convertTargetUuid ? (
        <ConvertIettsToCustomerModal
          recordUuid={convertTargetUuid}
          onClose={() => setConvertTargetUuid(null)}
          onError={(errorMessage) => setMessage(errorMessage)}
        />
      ) : null}
    </>
  );
}

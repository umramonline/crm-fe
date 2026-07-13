import { FormEvent, MouseEvent, useEffect, useMemo, useState } from "react";

import type { Permission } from "@/features/auth/services/authApi";
import {
  getCustomer,
  type CustomerDetail,
} from "@/features/customers/services/customerApi";
import {
  getFollowUp,
  listAssignedFollowUps,
  listFollowUps,
  type FollowUpDetail,
  type FollowUpListItem,
  type FollowUpListQuery,
} from "@/features/followUps/services/followUpApi";

type FollowUpsPageProps = {
  permissions: Permission[];
};

type FollowUpFilters = {
  title: string;
  customer: string;
  assignedUserFullName: string;
  branchName: string;
  visitDate: string;
  nextVisitDate: string;
};

function createEmptyFilters(): FollowUpFilters {
  return {
    title: "",
    customer: "",
    assignedUserFullName: "",
    branchName: "",
    visitDate: "",
    nextVisitDate: "",
  };
}

function filtersAreEmpty(filters: FollowUpFilters): boolean {
  return Object.values(filters).every((value) => value.trim() === "");
}

export function FollowUpsPage({ permissions }: FollowUpsPageProps) {
  const permissionNames = useMemo(
    () => new Set(permissions.map((permission) => permission.name)),
    [permissions],
  );
  const canListFollowUps = permissionNames.has("follow_ups.list");
  const canListAssignedFollowUps = permissionNames.has(
    "follow_ups.assigned.list",
  );
  const canLoadFollowUps = canListFollowUps || canListAssignedFollowUps;
  const canViewFollowUpDetail = permissionNames.has("follow_ups.detail");
  const canViewCustomerDetail =
    permissionNames.has("customers.detail") ||
    permissionNames.has("customers.detail.backend");

  const [draftFilters, setDraftFilters] =
    useState<FollowUpFilters>(() => createEmptyFilters());
  const [appliedFilters, setAppliedFilters] =
    useState<FollowUpFilters>(() => createEmptyFilters());
  const [items, setItems] = useState<FollowUpListItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<FollowUpListQuery["sortBy"]>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedFollowUp, setSelectedFollowUp] =
    useState<FollowUpDetail | null>(null);
  const [selectedCustomerDetail, setSelectedCustomerDetail] =
    useState<CustomerDetail | null>(null);
  const [isLoadingCustomerDetail, setIsLoadingCustomerDetail] = useState(false);

  useEffect(() => {
    if (!canLoadFollowUps) {
      setItems([]);
      setTotal(0);
      setLastPage(1);
      return;
    }

    let isActive = true;

    async function loadFollowUps(): Promise<void> {
      setIsLoading(true);
      setMessage("");

      try {
        const followUpListLoader = canListFollowUps
          ? listFollowUps
          : listAssignedFollowUps;
        const result = await followUpListLoader({
          page: currentPage,
          perPage: 20,
          title: appliedFilters.title,
          customer: appliedFilters.customer,
          assignedUserFullName: appliedFilters.assignedUserFullName,
          branchName: appliedFilters.branchName,
          visitDate: appliedFilters.visitDate,
          nextVisitDate: appliedFilters.nextVisitDate,
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
          setMessage("Takip kayıtları getirilemedi.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadFollowUps();

    return () => {
      isActive = false;
    };
  }, [
    appliedFilters,
    canLoadFollowUps,
    canListFollowUps,
    currentPage,
    sortBy,
    sortOrder,
  ]);

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

    if (!shouldClearDraftFilters && !shouldClearAppliedFilters && !shouldResetPagination && !shouldResetSort) {
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

  function handleSort(nextSortBy: FollowUpListQuery["sortBy"]): void {
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

  async function handleOpenFollowUpDetail(
    followUp: FollowUpListItem,
  ): Promise<void> {
    if (!canViewFollowUpDetail) {
      return;
    }

    setMessage("");

    try {
      const detail = await getFollowUp(followUp.uuid);
      setSelectedFollowUp(detail);
    } catch {
      setMessage("Takip kaydı detayı getirilemedi.");
    }
  }

  async function handleOpenCustomerDetail(
    event: MouseEvent<HTMLButtonElement>,
    customerId: number,
  ): Promise<void> {
    event.stopPropagation();

    if (!canViewCustomerDetail || !customerId) {
      return;
    }

    setSelectedCustomerDetail(null);
    setIsLoadingCustomerDetail(true);
    setMessage("");

    try {
      const customer = await getCustomer(customerId, "backend");
      setSelectedCustomerDetail(customer);
    } catch {
      setMessage("Müşteri detayı getirilemedi.");
    } finally {
      setIsLoadingCustomerDetail(false);
    }
  }

  if (!canLoadFollowUps) {
    return (
      <section className="panel-card permission-table-panel">
        <h1>Tüm Takip Kayıtları</h1>
        <p className="muted-text">
          Takip kayıtları listesini görüntüleme yetkiniz yok.
        </p>
      </section>
    );
  }

  return (
    <section className="panel-card permission-table-panel">
      {selectedFollowUp ? (
        <div className="customer-modal-backdrop" role="presentation">
          <section
            className="customer-modal customer-modal-wide"
            role="dialog"
            aria-modal="true"
          >
            <div className="customer-modal-header">
              <h2>Takip Kaydı Detayı</h2>
              <button
                className="customer-modal-close"
                type="button"
                onClick={() => setSelectedFollowUp(null)}
              >
                Kapat
              </button>
            </div>

            <div className="customer-detail-grid">
              <span>Takip Başlığı</span>
              <strong>{selectedFollowUp.title || "-"}</strong>
              <span>Müşteri</span>
              <strong>{selectedFollowUp.customerUnvan || "-"}</strong>
              <span>Atanan Personel</span>
              <strong>{selectedFollowUp.assignedUserFullName || "-"}</strong>
              <span>Müşteri Bayisi</span>
              <strong>{selectedFollowUp.branchName || "-"}</strong>
              <span>Ziyaret Tipi</span>
              <strong>{selectedFollowUp.visitType || "-"}</strong>
              <span>Ziyaret Tarihi</span>
              <strong>{formatDate(selectedFollowUp.visitDate)}</strong>
              <span>Sonraki Ziyaret Tarihi</span>
              <strong>{formatDate(selectedFollowUp.nextVisitDate)}</strong>
              <span>Anlaşma Sağlandı mı?</span>
              <strong>{formatAgreement(selectedFollowUp.agreementReached)}</strong>
              <span>Anlaşmama Sebebi</span>
              <strong>{selectedFollowUp.agreementFailureReason || "-"}</strong>
              <span>Not</span>
              <strong>{selectedFollowUp.note || "-"}</strong>
            </div>

            <h3>Görüşülen Kişiler</h3>
            <div className="permission-table-scroll">
              <table className="permission-table customer-table">
                <thead>
                  <tr>
                    <th>Ünvan</th>
                    <th>Ad Soyad</th>
                    <th>Telefon</th>
                    <th>E-posta</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedFollowUp.meetPeople.length > 0 ? (
                    selectedFollowUp.meetPeople.map((person) => (
                      <tr key={person.uuid}>
                        <td>{person.title || "-"}</td>
                        <td>{`${person.name} ${person.surname}`.trim() || "-"}</td>
                        <td>{person.phone || "-"}</td>
                        <td>{person.email || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>Görüşülen kişi bulunamadı.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <h3>Resimler</h3>
            {selectedFollowUp.images.length > 0 ? (
              <div className="customer-detail-grid">
                {selectedFollowUp.images.map((image, index) => (
                  <span key={image.uuid}>
                    Resim {index + 1}:{" "}
                    <a href={image.url} target="_blank" rel="noreferrer">
                      Görüntüle
                    </a>
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted-text">Resim bulunamadı.</p>
            )}
          </section>
        </div>
      ) : null}

      {selectedCustomerDetail ? (
        <div className="customer-modal-backdrop" role="presentation">
          <section
            className="customer-modal customer-modal-wide"
            role="dialog"
            aria-modal="true"
          >
            <div className="customer-modal-header">
              <h2>Müşteri Detayı</h2>
              <button
                className="customer-modal-close"
                type="button"
                onClick={() => setSelectedCustomerDetail(null)}
              >
                Kapat
              </button>
            </div>

            <div className="customer-detail-grid">
              <span>ID</span>
              <strong>{selectedCustomerDetail.id || "-"}</strong>
              <span>Ünvan</span>
              <strong>{selectedCustomerDetail.unvan || "-"}</strong>
              <span>Ad</span>
              <strong>{selectedCustomerDetail.ad || "-"}</strong>
              <span>Soyad</span>
              <strong>{selectedCustomerDetail.soyad || "-"}</strong>
              <span>Yetkili Adı</span>
              <strong>{selectedCustomerDetail.yetkiliAdi || "-"}</strong>
              <span>Cep</span>
              <strong>{selectedCustomerDetail.cep || "-"}</strong>
              <span>Telefon</span>
              <strong>{selectedCustomerDetail.telefon || "-"}</strong>
              <span>Mahalle</span>
              <strong>{selectedCustomerDetail.mahalle || "-"}</strong>
              <span>İl Kodu</span>
              <strong>{selectedCustomerDetail.ilKodu || "-"}</strong>
              <span>İlçe Kodu</span>
              <strong>{selectedCustomerDetail.ilceKodu || "-"}</strong>
              <span>Vergi No</span>
              <strong>{selectedCustomerDetail.vergiNo || "-"}</strong>
              <span>T.C. No</span>
              <strong>{selectedCustomerDetail.tcNo || "-"}</strong>
              <span>Müşteri Türü</span>
              <strong>{selectedCustomerDetail.type || "-"}</strong>
              <span>Kayıt Tarihi</span>
              <strong>{formatDate(selectedCustomerDetail.createdAt)}</strong>
            </div>
          </section>
        </div>
      ) : null}
      <form className="customer-filter-form" onSubmit={handleFilterSubmit}>
        <div className="customer-filter-actions">
            <h1>Tüm Takip Kayıtları</h1>
            <button className="blue-button" type="submit">Ara</button>
            <button className="gray-button" type="button" onClick={handleResetFilters}>Temizle</button>
            <p className="muted-text">Toplam {total} takip kaydı listeleniyor.</p>
        </div>

        {message ? <p className="form-message">{message}</p> : null}
        {isLoadingCustomerDetail ? (
          <p className="muted-text">Müşteri detayı yükleniyor...</p>
        ) : null}

      
        <div className="permission-table-scroll">
          <table className="permission-table customer-table">
            <thead>
              <tr>
                <th>İşlemler</th>
                <th>
                  Görev Başlığı
                </th>
                <th>Müşteri</th>
                <th>Atanan Personel</th>
                <th>Müşteri Bayisi</th>
                <th>
                  <button
                    className="table-sort-button"
                    type="button"
                    onClick={() => handleSort("visit_date")}
                  >
                    Ziyaret Tarihi {sortIndicator("visit_date", sortBy, sortOrder)}
                  </button>
                </th>
                <th>
                  <button
                    className="table-sort-button"
                    type="button"
                    onClick={() => handleSort("next_visit_date")}
                  >
                    Sonraki Ziyaret Tarihi{" "}
                    {sortIndicator("next_visit_date", sortBy, sortOrder)}
                  </button>
                </th>
                <th>
                  <button
                    className="table-sort-button"
                    type="button"
                    onClick={() => handleSort("agreement_reached")}
                  >
                    Anlaşma Sağlandı mı?{" "}
                    {sortIndicator("agreement_reached", sortBy, sortOrder)}
                  </button>
                </th>
              </tr>
              <tr className="customer-filter-row">
                <th />
                <th>
                  <input
                    className="panel-input"
                    type="text"
                    value={draftFilters.title}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                  />
                </th>
                <th>
                  <input
                    className="panel-input"
                    type="text"
                    value={draftFilters.customer}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        customer: event.target.value,
                      }))
                    }
                  />
                </th>
                <th>
                  <input
                    className="panel-input"
                    type="text"
                    value={draftFilters.assignedUserFullName}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        assignedUserFullName: event.target.value,
                      }))
                    }
                  />
                </th>
                <th>
                  <input
                    className="panel-input"
                    type="text"
                    value={draftFilters.branchName}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        branchName: event.target.value,
                      }))
                    }
                  />
                </th>
                <th>
                  <input
                    className="panel-input"
                    type="text"
                    value={draftFilters.visitDate}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        visitDate: event.target.value,
                      }))
                    }
                  />
                </th>
                <th>
                  <input
                    className="panel-input"
                    type="text"
                    value={draftFilters.nextVisitDate}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        nextVisitDate: event.target.value,
                      }))
                    }
                  />
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((followUp) => (
                  <tr
                    key={followUp.uuid}
                    role="button"
                    tabIndex={0}
                    onClick={() => void handleOpenFollowUpDetail(followUp)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void handleOpenFollowUpDetail(followUp);
                      }
                    }}
                  >
                    <td>
                      <button
                        className="customer-action-button"
                        type="button"
                        disabled={!canViewFollowUpDetail}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleOpenFollowUpDetail(followUp);
                        }}
                        aria-label="Takip kaydını görüntüle"
                      >
                        ⓘ
                      </button>
                    </td>
                    <td>{followUp.title || "-"}</td>
                    <td>
                      <button
                        className="table-sort-button"
                        type="button"
                        disabled={!canViewCustomerDetail}
                        onClick={(event) =>
                          void handleOpenCustomerDetail(
                            event,
                            followUp.customerId,
                          )
                        }
                      >
                        {followUp.customerUnvan || "-"}
                      </button>
                    </td>
                    <td>{followUp.assignedUserFullName || "-"}</td>
                    <td>{followUp.branchName || "-"}</td>
                    <td>{formatDate(followUp.visitDate)}</td>
                    <td>{formatDate(followUp.nextVisitDate)}</td>
                    <td>{formatAgreement(followUp.agreementReached)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    {isLoading ? "Takip kayıtları yükleniyor..." : "Kayıt bulunamadı."}
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
          Önceki
        </button>
        <span className="muted-text">
          Sayfa {currentPage} / {lastPage}
        </span>
        <button
          className="gray-button"
          type="button"
          disabled={currentPage >= lastPage || isLoading}
          onClick={() => setCurrentPage((page) => Math.min(lastPage, page + 1))}
        >
          Sonraki
        </button>
      </div>
    </section>
  );
}

function sortIndicator(
  column: FollowUpListQuery["sortBy"],
  sortBy: FollowUpListQuery["sortBy"],
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

function formatAgreement(value: boolean): string {
  return value ? "Evet" : "Hayır";
}

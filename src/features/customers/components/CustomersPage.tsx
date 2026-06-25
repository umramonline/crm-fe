import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  listCustomers,
  type Customer,
  type CustomerListQuery,
} from "@/features/customers/services/customerApi";
import type { Permission } from "@/features/auth/services/authApi";

const situationOptions = [
  "Aktif Müşteri",
  "Yarı Aktif Müşteri",
  "Pasif Müşteri",
  "Kayıp Müşteri",
  "Potansiyel Müşteri",
] as const;

const sourceOptions = ["PlusCard", "Manuel"] as const;

const typeOptions = ["Kurumsal", "Bireysel"] as const;

type CustomerFilters = {
  situation: string;
  unvan: string;
  cep: string;
  ad: string;
  soyad: string;
  branchName: string;
  plusCardNo: string;
  source: string;
  city: string;
  town: string;
  createdAt: string;
  type: string;
};

const emptyFilters: CustomerFilters = {
  situation: "",
  unvan: "",
  cep: "",
  ad: "",
  soyad: "",
  branchName: "",
  plusCardNo: "",
  source: "",
  city: "",
  town: "",
  createdAt: "",
  type: "",
};

type CustomersPageProps = {
  permissions: Permission[];
};

export function CustomersPage({ permissions }: CustomersPageProps) {
  const permissionNames = useMemo(
    () => new Set(permissions.map((permission) => permission.name)),
    [permissions],
  );
  const canListCustomers = permissionNames.has("customers.list");

  const [draftFilters, setDraftFilters] = useState<CustomerFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<CustomerFilters>(emptyFilters);
  const [items, setItems] = useState<Customer[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<CustomerListQuery["sortBy"]>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!canListCustomers) {
      return;
    }

    let isActive = true;

    async function loadCustomers(): Promise<void> {
      setIsLoading(true);
      setMessage("");

      try {
        const result = await listCustomers({
          page: currentPage,
          perPage: 10,
          situation: appliedFilters.situation,
          unvan: appliedFilters.unvan,
          cep: appliedFilters.cep,
          ad: appliedFilters.ad,
          soyad: appliedFilters.soyad,
          branchName: appliedFilters.branchName,
          plusCardNo: appliedFilters.plusCardNo,
          source: appliedFilters.source,
          city: appliedFilters.city,
          town: appliedFilters.town,
          createdAt: appliedFilters.createdAt,
          type: appliedFilters.type,
          sortBy,
          sortOrder,
        });

        if (!isActive) {
          return;
        }

        setItems(result.items);
        setCurrentPage(result.pagination.currentPage || 1);
        setLastPage(result.pagination.lastPage || 1);
        setTotal(result.pagination.total || 0);
      } catch {
        if (isActive) {
          setItems([]);
          setMessage("Müşteri listesi getirilemedi.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadCustomers();

    return () => {
      isActive = false;
    };
  }, [appliedFilters, canListCustomers, currentPage, sortBy, sortOrder]);

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setCurrentPage(1);
    setAppliedFilters({ ...draftFilters });
  }

  function handleResetFilters(): void {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setCurrentPage(1);
    setSortBy("");
    setSortOrder("desc");
  }

  function handleSort(column: "credit" | "created_at"): void {
    if (sortBy === column) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(column);
    setSortOrder(column === "credit" ? "desc" : "desc");
    setCurrentPage(1);
  }

  if (!canListCustomers) {
    return (
      <section className="panel-card">
        <div className="page-title">
          <h1>Müşteriler</h1>
          <p>Bu sayfayı görüntüleme yetkiniz bulunmuyor.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel-card permission-table-panel">
      <div className="page-title">
        <h1>Müşteriler</h1>
        <p>PlusCard müşteri listesini filtreleyebilir, sıralayabilir ve sayfalayabilirsiniz.</p>
      </div>

      {message ? <div className="panel-alert">{message}</div> : null}

      <form className="customer-filter-form" onSubmit={handleFilterSubmit}>
        <div className="customer-filter-actions">
          <button className="blue-button" type="submit">
            Filtrele
          </button>
          <button className="gray-button" type="button" onClick={handleResetFilters}>
            Temizle
          </button>
          <span className="muted-text">
            {isLoading ? "Yükleniyor..." : `Toplam ${total} kayıt`}
          </span>
        </div>
      </form>

      <div className="permission-table-scroll">
        <table className="permission-table customer-table">
          <thead>
            <tr>
              <th>Durum</th>
              <th>Firma İsmi</th>
              <th>Yetkili Telefonu</th>
              <th>Yetkili İsmi</th>
              <th>Yetkili Soyismi</th>
              <th>Bayi</th>
              <th>Plus Card No</th>
              <th>
                <button
                  className="table-sort-button"
                  type="button"
                  onClick={() => handleSort("credit")}
                >
                  Plus Card Bakiyesi
                  {sortBy === "credit" ? (sortOrder === "asc" ? " ↑" : " ↓") : ""}
                </button>
              </th>
              <th>Müşteri Kaynağı</th>
              <th>İl</th>
              <th>İlçe</th>
              <th>
                <button
                  className="table-sort-button"
                  type="button"
                  onClick={() => handleSort("created_at")}
                >
                  Kayıt Tarihi
                  {sortBy === "created_at" ? (sortOrder === "asc" ? " ↑" : " ↓") : ""}
                </button>
              </th>
              <th>Müşteri Türü</th>
            </tr>
            <tr className="customer-filter-row">
              <th>
                <select
                  className="panel-input"
                  value={draftFilters.situation}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      situation: event.target.value,
                    }))
                  }
                >
                  <option value="">Tümü</option>
                  {situationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.unvan}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      unvan: event.target.value,
                    }))
                  }
                />
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.cep}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      cep: event.target.value,
                    }))
                  }
                />
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.ad}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      ad: event.target.value,
                    }))
                  }
                />
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.soyad}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      soyad: event.target.value,
                    }))
                  }
                />
              </th>
              <th>
                <input
                  className="panel-input"
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
                  value={draftFilters.plusCardNo}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      plusCardNo: event.target.value,
                    }))
                  }
                />
              </th>
              <th />
              <th>
                <select
                  className="panel-input"
                  value={draftFilters.source}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      source: event.target.value,
                    }))
                  }
                >
                  <option value="">Tümü</option>
                  {sourceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.city}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                />
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.town}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      town: event.target.value,
                    }))
                  }
                />
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.createdAt}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      createdAt: event.target.value,
                    }))
                  }
                />
              </th>
              <th>
                <select
                  className="panel-input"
                  value={draftFilters.type}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                >
                  <option value="">Tümü</option>
                  {typeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={13}>Kayıt bulunamadı.</td>
              </tr>
            ) : null}

            {items.map((customer, index) => (
              <tr key={`${customer.plusCardNo}-${customer.cep}-${index}`}>
                <td>{customer.situation || "-"}</td>
                <td>{customer.unvan || "-"}</td>
                <td>{customer.cep || "-"}</td>
                <td>{customer.ad || "-"}</td>
                <td>{customer.soyad || "-"}</td>
                <td>{customer.branchName || "-"}</td>
                <td>{customer.plusCardNo || "-"}</td>
                <td>{formatCredit(customer.credit)}</td>
                <td>{customer.source || "-"}</td>
                <td>{customer.city || "-"}</td>
                <td>{customer.town || "-"}</td>
                <td>{formatDate(customer.createdAt)}</td>
                <td>{formatCustomerType(customer.type)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="customer-pagination">
        <button
          className="gray-button"
          type="button"
          disabled={currentPage <= 1 || isLoading}
          onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
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
          onClick={() => setCurrentPage((page) => Math.min(page + 1, lastPage))}
        >
          Sonraki
        </button>
      </div>
    </section>
  );
}

function formatCredit(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(value);
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

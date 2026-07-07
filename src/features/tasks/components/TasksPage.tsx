import { FormEvent, useEffect, useMemo, useState } from "react";

import type { Permission } from "@/features/auth/services/authApi";
import {
  getCustomer,
  type CustomerDetail,
} from "@/features/customers/services/customerApi";
import {
  cancelTask,
  getTaskDetail,
  listAssignedTasks,
  listTasks,
  type TaskListItem,
  type TaskListQuery,
  type TaskPriority,
  type TaskStatus,
} from "@/features/tasks/services/taskApi";

const priorityOptions: TaskPriority[] = ["high", "medium", "low"];
const statusOptions: TaskStatus[] = [
  "pending",
  "in_progress",
  "cancelled",
  "completed",
];
const customerPreviewMaxLength = 20;
const unrestrictedTaskRoleIds = new Set([30, 60, 63]);

type TaskFilters = {
  title: string;
  customer: string;
  assignedUserFullName: string;
  branchName: string;
  visitDate: string;
  dueDate: string;
  priority: TaskPriority | "";
  status: TaskStatus | "";
  createdByUserFullName: string;
};

type TasksPageProps = {
  permissions: Permission[];
  roleId: number;
};

const emptyFilters: TaskFilters = {
  title: "",
  customer: "",
  assignedUserFullName: "",
  branchName: "",
  visitDate: "",
  dueDate: "",
  priority: "",
  status: "",
  createdByUserFullName: "",
};

export function TasksPage({ permissions, roleId }: TasksPageProps) {
  const permissionNames = useMemo(
    () => new Set(permissions.map((permission) => permission.name)),
    [permissions],
  );
  const shouldListOnlyAssignedTasks = !unrestrictedTaskRoleIds.has(roleId);
  const canListTasks = shouldListOnlyAssignedTasks
    ? permissionNames.has("tasks.assigned.list") ||
      permissionNames.has("tasks.list")
    : permissionNames.has("tasks.list");
  const canViewTaskDetail = permissionNames.has("tasks.detail");
  const canCancelTasks = permissionNames.has("tasks.cancel");
  const canViewCustomerDetail =
    permissionNames.has("customers.detail") ||
    permissionNames.has("customers.detail.backend");

  const [draftFilters, setDraftFilters] = useState<TaskFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<TaskFilters>(emptyFilters);
  const [items, setItems] = useState<TaskListItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<TaskListQuery["sortBy"]>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedTask, setSelectedTask] = useState<TaskListItem | null>(null);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerDetail | null>(null);
  const [cancellingTaskUuid, setCancellingTaskUuid] = useState("");
  const [expandedCustomerRows, setExpandedCustomerRows] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    if (!canListTasks) {
      setItems([]);
      setTotal(0);
      setLastPage(1);
      return;
    }

    let isActive = true;

    async function loadTasks(): Promise<void> {
      setIsLoading(true);
      setMessage("");

      try {
        const taskListLoader = shouldListOnlyAssignedTasks
          ? listAssignedTasks
          : listTasks;
        const result = await taskListLoader({
          page: currentPage,
          perPage: 20,
          title: appliedFilters.title,
          customer: appliedFilters.customer,
          assignedUserFullName: appliedFilters.assignedUserFullName,
          branchName: appliedFilters.branchName,
          visitDate: appliedFilters.visitDate,
          dueDate: appliedFilters.dueDate,
          priority: appliedFilters.priority,
          status: appliedFilters.status,
          createdByUserFullName: appliedFilters.createdByUserFullName,
          sortBy,
          sortOrder,
        });

        if (isActive) {
          setItems(result.items);
          setCurrentPage(result.pagination.currentPage || 1);
          setLastPage(result.pagination.lastPage || 1);
          setTotal(result.pagination.total);
        }
      } catch {
        if (isActive) {
          setItems([]);
          setTotal(0);
          setLastPage(1);
          setMessage("Görev listesi getirilemedi.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadTasks();

    return () => {
      isActive = false;
    };
  }, [
    appliedFilters,
    canListTasks,
    currentPage,
    shouldListOnlyAssignedTasks,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    if (expandedCustomerRows.size === 0) {
      return;
    }

    function handleDocumentMouseDown(event: MouseEvent): void {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest("[data-task-customer-cell='true']")) {
        return;
      }

      setExpandedCustomerRows(new Set());
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, [expandedCustomerRows.size]);

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setAppliedFilters(draftFilters);
    setCurrentPage(1);
  }

  function handleResetFilters(): void {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setSortBy("");
    setSortOrder("desc");
    setCurrentPage(1);
  }

  function updateDraftFilter<K extends keyof TaskFilters>(
    field: K,
    value: TaskFilters[K],
  ): void {
    setDraftFilters((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSort(nextSortBy: NonNullable<TaskListQuery["sortBy"]>): void {
    if (!nextSortBy) {
      return;
    }

    if (sortBy === nextSortBy) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(nextSortBy);
      setSortOrder("asc");
    }

    setCurrentPage(1);
  }

  async function handleOpenTaskDetail(task: TaskListItem): Promise<void> {
    if (!canViewTaskDetail) {
      return;
    }

    try {
      setMessage("");
      const taskDetail = await getTaskDetail(task.uuid, task.customers[0]?.id);
      setSelectedTask(taskDetail);
    } catch {
      setMessage("Görev detayı getirilemedi.");
    }
  }

  async function handleOpenCustomerDetail(customerId: number): Promise<void> {
    if (!canViewCustomerDetail) {
      return;
    }

    try {
      setMessage("");
      const customer = await getCustomer(customerId, "backend");
      setSelectedCustomer(customer);
    } catch {
      setMessage("Müşteri detayı getirilemedi.");
    }
  }

  async function handleCancelTask(task: TaskListItem): Promise<void> {
    const customerId = task.customers[0]?.id ?? 0;
    if (!canCancelTasks || !canTaskBeCancelled(task) || customerId === 0) {
      return;
    }

    const confirmed = window.confirm(
      "Görevi iptal etmek istediğinize emin misiniz?",
    );
    if (!confirmed) {
      return;
    }

    setCancellingTaskUuid(task.uuid);
    setMessage("");

    try {
      const cancelledTask = await cancelTask(task.uuid, customerId);
      setItems((current) =>
        current.map((item) =>
          item.uuid === cancelledTask.uuid &&
          item.customers[0]?.id === customerId
            ? {
                ...item,
                status: cancelledTask.status,
              }
            : item,
        ),
      );
      setSelectedTask((current) =>
        current?.uuid === cancelledTask.uuid &&
        current.customers[0]?.id === customerId
          ? {
              ...current,
              status: cancelledTask.status,
            }
          : current,
      );
      setMessage("Görev iptal edildi.");
    } catch {
      setMessage("Görev iptal edilemedi.");
    } finally {
      setCancellingTaskUuid("");
    }
  }

  function handleExpandTaskCustomerRow(rowId: string): void {
    setExpandedCustomerRows((current) => {
      const next = new Set(current);
      next.add(rowId);

      return next;
    });
  }

  if (!canListTasks) {
    return (
      <section className="panel-card permission-table-panel">
        <h1>Tüm Görevler</h1>
        <p className="muted-text">Görev listesini görüntüleme yetkiniz yok.</p>
      </section>
    );
  }

  return (
    <section className="panel-card permission-table-panel">
      {selectedTask ? (
        <div className="customer-modal-backdrop" role="presentation">
          <section
            className="customer-modal customer-modal-wide"
            role="dialog"
            aria-modal="true"
          >
            <div className="customer-modal-header">
              <h2>Görev Detayı</h2>
              <button
                className="customer-modal-close"
                type="button"
                onClick={() => setSelectedTask(null)}
              >
                Kapat
              </button>
            </div>

            <div className="customer-detail-grid">
              <span>Görev Başlığı</span>
              <strong>{selectedTask.title || "Potansiyel Müşteri"}</strong>
              <span>Açıklama</span>
              <strong>{selectedTask.description || "-"}</strong>
              <span>Müşteri</span>
              <strong>{taskCustomerNames(selectedTask)}</strong>
              <span>Atanan Personel</span>
              <strong>{selectedTask.assignedUserFullName || "-"}</strong>
              <span>Müşteri Bayisi</span>
              <strong>{selectedTask.branchName || "-"}</strong>
              <span>Ziyaret Tarihi</span>
              <strong>{formatDate(selectedTask.visitDate)}</strong>
              <span>Son Ziyaret Tarihi</span>
              <strong>{formatDate(selectedTask.dueDate)}</strong>
              <span>Öncelik</span>
              <strong>{formatTaskPriority(selectedTask.priority)}</strong>
              <span>Durum</span>
              <strong>{formatTaskStatus(selectedTask.status)}</strong>
              <span>Oluşturan</span>
              <strong>{selectedTask.createdByUserFullName || "-"}</strong>
            </div>
          </section>
        </div>
      ) : null}

      {selectedCustomer ? (
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
                onClick={() => setSelectedCustomer(null)}
              >
                Kapat
              </button>
            </div>

            <div className="customer-detail-grid">
              <span>ID</span>
              <strong>{selectedCustomer.id || "-"}</strong>
              <span>Ünvan</span>
              <strong>{selectedCustomer.unvan || "-"}</strong>
              <span>Ad</span>
              <strong>{selectedCustomer.ad || "-"}</strong>
              <span>Soyad</span>
              <strong>{selectedCustomer.soyad || "-"}</strong>
              <span>Yetkili Adı</span>
              <strong>{selectedCustomer.yetkiliAdi || "-"}</strong>
              <span>Cep</span>
              <strong>{selectedCustomer.cep || "-"}</strong>
              <span>Telefon</span>
              <strong>{selectedCustomer.telefon || "-"}</strong>
              <span>Vergi No</span>
              <strong>{selectedCustomer.vergiNo || "-"}</strong>
              <span>T.C. No</span>
              <strong>{selectedCustomer.tcNo || "-"}</strong>
              <span>Müşteri Türü</span>
              <strong>{formatCustomerType(selectedCustomer.type)}</strong>
            </div>
          </section>
        </div>
      ) : null}

      <form className="customer-filter-form" onSubmit={handleFilterSubmit}>
        <div className="customer-filter-actions">
          <h1>Tüm Görevler</h1>
          <button className="blue-button" type="submit" disabled={isLoading}>
            Filtrele
          </button>
          <button
            className="gray-button"
            type="button"
            onClick={handleResetFilters}
          >
            Temizle
          </button>
          <span className="muted-text">
            {isLoading ? "Yükleniyor..." : `Toplam ${total} kayıt`}
          </span>
        </div>
      </form>

      {message ? <p className="customer-message">{message}</p> : null}

      <div className="permission-table-scroll">
        <table className="permission-table customer-table task-table">
          <thead>
            <tr>
              <th>İşlemler</th>
              <th>Görev Başlığı</th>
              <th>Müşteri</th>
              <th>Atanan Personel</th>
              <th>Müşteri Bayisi</th>
              <th>
                <button
                  className="table-sort-button"
                  type="button"
                  onClick={() => handleSort("visit_date")}
                >
                  Ziyaret Tarihi
                  {sortBy === "visit_date"
                    ? sortOrder === "asc"
                      ? " ↑"
                      : " ↓"
                    : ""}
                </button>
              </th>
              <th>
                <button
                  className="table-sort-button"
                  type="button"
                  onClick={() => handleSort("due_date")}
                >
                  Son Ziyaret Tarihi
                  {sortBy === "due_date"
                    ? sortOrder === "asc"
                      ? " ↑"
                      : " ↓"
                    : ""}
                </button>
              </th>
              <th>Öncelik</th>
              <th>Durum</th>
              <th>Oluşturan</th>
            </tr>
            <tr className="customer-filter-row">
              <th />
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.title}
                  onChange={(event) =>
                    updateDraftFilter("title", event.target.value)
                  }
                />
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.customer}
                  onChange={(event) =>
                    updateDraftFilter("customer", event.target.value)
                  }
                />
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.assignedUserFullName}
                  onChange={(event) =>
                    updateDraftFilter(
                      "assignedUserFullName",
                      event.target.value,
                    )
                  }
                />
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.branchName}
                  onChange={(event) =>
                    updateDraftFilter("branchName", event.target.value)
                  }
                />
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.visitDate}
                  onChange={(event) =>
                    updateDraftFilter("visitDate", event.target.value)
                  }
                />
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.dueDate}
                  onChange={(event) =>
                    updateDraftFilter("dueDate", event.target.value)
                  }
                />
              </th>
              <th>
                <select
                  className="panel-input"
                  value={draftFilters.priority}
                  onChange={(event) =>
                    updateDraftFilter(
                      "priority",
                      event.target.value as TaskPriority | "",
                    )
                  }
                >
                  <option value="">Tümü</option>
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {formatTaskPriority(priority)}
                    </option>
                  ))}
                </select>
              </th>
              <th>
                <select
                  className="panel-input"
                  value={draftFilters.status}
                  onChange={(event) =>
                    updateDraftFilter(
                      "status",
                      event.target.value as TaskStatus | "",
                    )
                  }
                >
                  <option value="">Tümü</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {formatTaskStatus(status)}
                    </option>
                  ))}
                </select>
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.createdByUserFullName}
                  onChange={(event) =>
                    updateDraftFilter(
                      "createdByUserFullName",
                      event.target.value,
                    )
                  }
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={10}>Kayıt bulunamadı.</td>
              </tr>
            ) : null}

            {items.map((task) => {
              const rowId = taskCustomerRowId(task);

              return (
                <tr key={rowId}>
                  <td>
                    <div className="customer-action-group">
                      <button
                        className="customer-action-button"
                        type="button"
                        aria-label="Görev detayını görüntüle"
                        disabled={!canViewTaskDetail}
                        onClick={() => void handleOpenTaskDetail(task)}
                      >
                        ⓘ
                      </button>
                      <button
                        className="customer-action-button task-cancel-button"
                        type="button"
                        aria-label="Görevi iptal et"
                        disabled={
                          !canCancelTasks ||
                          !canTaskBeCancelled(task) ||
                          !task.customers[0] ||
                          cancellingTaskUuid === task.uuid
                        }
                        onClick={() => void handleCancelTask(task)}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                  <td>{task.title || "Potansiyel Müşteri"}</td>
                  <td>
                    <div
                      className="task-customer-list"
                      data-task-customer-cell="true"
                    >
                      {shouldCollapseTaskCustomer(task) &&
                      !expandedCustomerRows.has(rowId) ? (
                        <button
                          className="task-customer-preview"
                          type="button"
                          onClick={() => handleExpandTaskCustomerRow(rowId)}
                        >
                          {truncateCustomerText(taskPrimaryCustomerName(task))}
                        </button>
                      ) : (
                        <button
                          className="task-customer-link"
                          type="button"
                          disabled={
                            !canViewCustomerDetail || !task.customers[0]
                          }
                          onClick={() =>
                            void handleOpenCustomerDetail(
                              task.customers[0]?.id ?? 0,
                            )
                          }
                        >
                          {taskPrimaryCustomerName(task)}
                        </button>
                      )}
                    </div>
                  </td>
                  <td>{task.assignedUserFullName || "-"}</td>
                  <td>{task.branchName || "-"}</td>
                  <td>{formatDate(task.visitDate)}</td>
                  <td>{formatDate(task.dueDate)}</td>
                  <td>{formatTaskPriority(task.priority)}</td>
                  <td>{formatTaskStatus(task.status)}</td>
                  <td>{task.createdByUserFullName || "-"}</td>
                </tr>
              );
            })}
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

function taskCustomerNames(task: TaskListItem): string {
  if (task.customers.length === 0) {
    return "-";
  }

  return task.customers
    .map((customer) =>
      taskCustomerName(customer.unvan, customer.ad, customer.soyad),
    )
    .join(", ");
}

function taskCustomerRowId(task: TaskListItem): string {
  return `${task.uuid}-${task.customers[0]?.id ?? "no-customer"}`;
}

function taskPrimaryCustomerName(task: TaskListItem): string {
  const customer = task.customers[0];
  if (!customer) {
    return "-";
  }

  return taskCustomerName(customer.unvan, customer.ad, customer.soyad);
}

function shouldCollapseTaskCustomer(task: TaskListItem): boolean {
  return taskPrimaryCustomerName(task).length > customerPreviewMaxLength;
}

function truncateCustomerText(value: string): string {
  if (value.length <= customerPreviewMaxLength) {
    return value;
  }

  return `${value.slice(0, customerPreviewMaxLength)}...`;
}

function taskCustomerName(unvan: string, ad: string, soyad: string): string {
  const corporateName = unvan.trim();
  if (corporateName) {
    return corporateName;
  }

  const individualName = `${ad} ${soyad}`.trim();
  return individualName || "-";
}

function canTaskBeCancelled(task: TaskListItem): boolean {
  return task.status !== "cancelled" && task.status !== "completed";
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
  }).format(date);
}

function formatTaskPriority(priority: TaskPriority): string {
  const priorityMap: Record<TaskPriority, string> = {
    high: "Yüksek",
    medium: "Orta",
    low: "Düşük",
  };

  return priorityMap[priority];
}

function formatTaskStatus(status: TaskStatus): string {
  const statusMap: Record<TaskStatus, string> = {
    pending: "Bekliyor",
    in_progress: "Devam Ediyor",
    cancelled: "İptal Edildi",
    completed: "Tamamlandı",
  };

  return statusMap[status];
}

function formatCustomerType(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (normalized === "kurumsal") {
    return "Kurumsal";
  }

  if (normalized === "bireysel") {
    return "Bireysel";
  }

  return normalized ? value : "-";
}

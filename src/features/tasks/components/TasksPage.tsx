import { FormEvent, useEffect, useMemo, useState } from "react";

import type { Permission } from "@/features/auth/services/authApi";
import {
  getCustomer,
  type CustomerDetail,
} from "@/features/customers/services/customerApi";
import {
  cancelTask,
  createFollowUp,
  FollowUpValidationError,
  getTaskDetail,
  listAssignedTasks,
  listTasks,
  type FollowUpAgreementFailureReason,
  type FollowUpMeetPersonTitle,
  type FollowUpVisitType,
  type TaskCustomer,
  type TaskListItem,
  type TaskListQuery,
  type TaskPriority,
  type TaskStatus,
} from "@/features/tasks/services/taskApi";

const priorityOptions: TaskPriority[] = ["high", "medium", "low"];
const unrestrictedTaskRoleIds = new Set([30, 60, 63]);
const followUpVisitTypes: FollowUpVisitType[] = ["Yerinde Ziyaret"];
const followUpAgreementFailureReasons: FollowUpAgreementFailureReason[] = [
  "Fiyat yüksek",
  "Mesafe Uzak",
  "Bayi ile yaşanan sorunlar",
  "Ekpertize ihtiyaç duymuyor",
  "Kendisi yapıyor",
  "Başka ekspertize yaptırıyor",
  "Değerlendirme",
];
const followUpMeetPersonTitles: FollowUpMeetPersonTitle[] = [
  "Genel Müdür",
  "Satış Müdürü",
  "Operasyon Müdürü",
  "Pazarlama Müdürü",
  "İşletme Müdürü",
  "Bölge Müdürü",
  "Şube Müdürü",
  "Yönetici",
  "Sahibi",
  "Ortağı",
];
const followUpImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const followUpMaxImageTotalSize = 5 * 1024 * 1024;

type TaskFilters = {
  title: string;
  assignedUserFullName: string;
  branchName: string;
  visitDate: string;
  dueDate: string;
  priority: TaskPriority | "";
  createdByUserFullName: string;
};

type TasksPageProps = {
  permissions: Permission[];
  roleId: number;
  userId: number;
};

type FollowRecordSelection = {
  task: TaskListItem;
  customer: TaskCustomer;
};

type FollowUpForm = {
  visitDate: string;
  nextVisitDate: string;
  visitType: FollowUpVisitType | "";
  meetPersonTitle: FollowUpMeetPersonTitle | "";
  meetPersonName: string;
  meetPersonSurname: string;
  meetPersonPhone: string;
  meetPersonEmail: string;
  agreementReached: boolean;
  agreementFailureReason: FollowUpAgreementFailureReason | "";
  note: string;
  images: File[];
};

type FollowUpFormErrors = Partial<Record<keyof FollowUpForm | "form", string>>;

const emptyFilters: TaskFilters = {
  title: "",
  assignedUserFullName: "",
  branchName: "",
  visitDate: "",
  dueDate: "",
  priority: "",
  createdByUserFullName: "",
};

function createEmptyFollowUpForm(): FollowUpForm {
  const today = todayDateInputValue();

  return {
    visitDate: today,
    nextVisitDate: today,
    visitType: "Yerinde Ziyaret",
    meetPersonTitle: "",
    meetPersonName: "",
    meetPersonSurname: "",
    meetPersonPhone: "",
    meetPersonEmail: "",
    agreementReached: false,
    agreementFailureReason: "",
    note: "",
    images: [],
  };
}

export function TasksPage({ permissions, roleId, userId }: TasksPageProps) {
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
  const [selectedCustomerTask, setSelectedCustomerTask] =
    useState<TaskListItem | null>(null);
  const [selectedCustomerDetail, setSelectedCustomerDetail] =
    useState<CustomerDetail | null>(null);
  const [selectedFollowRecord, setSelectedFollowRecord] =
    useState<FollowRecordSelection | null>(null);
  const [followUpForm, setFollowUpForm] =
    useState<FollowUpForm>(() => createEmptyFollowUpForm());
  const [followUpErrors, setFollowUpErrors] = useState<FollowUpFormErrors>({});
  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false);
  const [isLoadingCustomerDetail, setIsLoadingCustomerDetail] = useState(false);
  const [cancellingTaskCustomerUuid, setCancellingTaskCustomerUuid] =
    useState("");

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
          assignedUserFullName: appliedFilters.assignedUserFullName,
          branchName: appliedFilters.branchName,
          visitDate: appliedFilters.visitDate,
          dueDate: appliedFilters.dueDate,
          priority: appliedFilters.priority,
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
      const taskDetail = await getTaskDetail(task.uuid);
      setSelectedTask(taskDetail);
    } catch {
      setMessage("Görev detayı getirilemedi.");
    }
  }

  function handleOpenTaskCustomerDetails(task: TaskListItem): void {
    if (task.customers.length === 0) {
      return;
    }

    setSelectedTask(null);
    setSelectedCustomerTask(task);
    setMessage("");
  }

  async function handleOpenCustomerDetail(
    customer: TaskCustomer,
  ): Promise<void> {
    setSelectedCustomerDetail(null);
    setIsLoadingCustomerDetail(true);
    setMessage("");

    try {
      const customerDetail = await getCustomer(customer.customerId, "backend");
      setSelectedCustomerDetail(customerDetail);
    } catch {
      setMessage("Müşteri detayı getirilemedi.");
    } finally {
      setIsLoadingCustomerDetail(false);
    }
  }

  function handleOpenFollowRecordModal(
    task: TaskListItem,
    customer: TaskCustomer,
  ): void {
    if (!canTaskCustomerOpenFollowRecord(task, customer, userId)) {
      return;
    }

    setFollowUpForm(createEmptyFollowUpForm());
    setFollowUpErrors({});
    setSelectedFollowRecord({ task, customer });
    setMessage("");
  }

  function updateFollowUpForm<K extends keyof FollowUpForm>(
    field: K,
    value: FollowUpForm[K],
  ): void {
    setFollowUpForm((current) => {
      const nextForm = {
        ...current,
        [field]: value,
      };

      if (field === "agreementReached" && value === true) {
        nextForm.agreementFailureReason = "";
      }
      if (
        field === "visitDate" &&
        typeof value === "string" &&
        nextForm.nextVisitDate < value
      ) {
        nextForm.nextVisitDate = value;
      }

      return nextForm;
    });
    setFollowUpErrors((current) => ({
      ...current,
      [field]: "",
      form: "",
    }));
  }

  function handleFollowUpImageChange(files: FileList | null): void {
    const images = Array.from(files ?? []);
    updateFollowUpForm("images", images);
  }

  async function handleFollowUpSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!selectedFollowRecord) {
      return;
    }

    const validationErrors = validateFollowUpForm(followUpForm);
    if (Object.keys(validationErrors).length > 0) {
      setFollowUpErrors(validationErrors);
      return;
    }

    setIsCreatingFollowUp(true);
    setFollowUpErrors({});
    setMessage("");

    try {
      await createFollowUp({
        tasksCustomerUuid: selectedFollowRecord.customer.uuid,
        visitDate: followUpForm.visitDate,
        nextVisitDate: followUpForm.nextVisitDate,
        visitType: followUpForm.visitType as FollowUpVisitType,
        agreementReached: followUpForm.agreementReached,
        agreementFailureReason: followUpForm.agreementFailureReason,
        note: followUpForm.note,
        meetPerson: {
          title: followUpForm.meetPersonTitle,
          name: followUpForm.meetPersonName.trim(),
          surname: followUpForm.meetPersonSurname.trim(),
          phone: followUpForm.meetPersonPhone.trim(),
          email: followUpForm.meetPersonEmail.trim(),
        },
        images: followUpForm.images,
      });
      setSelectedFollowRecord(null);
      setFollowUpForm(createEmptyFollowUpForm());
      setMessage("Takip kaydı oluşturuldu.");
    } catch (error: unknown) {
      if (error instanceof FollowUpValidationError) {
        setFollowUpErrors(apiFollowUpErrorsToFormErrors(error.errors));
      } else {
        setFollowUpErrors({
          form: "Takip kaydı oluşturulamadı.",
        });
      }
    } finally {
      setIsCreatingFollowUp(false);
    }
  }

  async function handleCancelTaskCustomer(
    task: TaskListItem,
    customer: TaskCustomer,
  ): Promise<void> {
    if (!canCancelTasks || !canTaskCustomerBeCancelled(customer)) {
      return;
    }

    const confirmed = window.confirm(
      "Bu müşteri için görevi iptal etmek istediğinize emin misiniz?",
    );
    if (!confirmed) {
      return;
    }

    setCancellingTaskCustomerUuid(customer.uuid);
    setMessage("");

    try {
      const cancelledTask = await cancelTask(task.uuid, customer.uuid);
      const cancelledCustomer = cancelledTask.customers[0];
      const nextStatus = cancelledCustomer?.status ?? "cancelled";

      const updateTaskCustomerStatus = (
        currentTask: TaskListItem,
      ): TaskListItem => ({
        ...currentTask,
        customers: currentTask.customers.map((currentCustomer) =>
          currentCustomer.uuid === customer.uuid
            ? {
                ...currentCustomer,
                status: nextStatus,
              }
            : currentCustomer,
        ),
      });

      setSelectedCustomerTask((current) =>
        current?.uuid === task.uuid
          ? updateTaskCustomerStatus(current)
          : current,
      );
      setItems((currentItems) =>
        currentItems.map((currentTask) =>
          currentTask.uuid === task.uuid
            ? updateTaskCustomerStatus(currentTask)
            : currentTask,
        ),
      );
      setMessage("Görev iptal edildi.");
    } catch {
      setMessage("Görev iptal edilemedi.");
    } finally {
      setCancellingTaskCustomerUuid("");
    }
  }

  function handleCloseCustomerDetails(): void {
    setSelectedCustomerTask(null);
    setSelectedCustomerDetail(null);
    setSelectedFollowRecord(null);
    setIsLoadingCustomerDetail(false);
  }

  function handleCloseCustomerDetail(): void {
    setSelectedCustomerDetail(null);
    setIsLoadingCustomerDetail(false);
  }

  function handleCloseFollowRecordModal(): void {
    setSelectedFollowRecord(null);
    setFollowUpForm(createEmptyFollowUpForm());
    setFollowUpErrors({});
    setIsCreatingFollowUp(false);
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
              <span>Oluşturan</span>
              <strong>{selectedTask.createdByUserFullName || "-"}</strong>
              <span aria-hidden="true" />
            </div>
            <button
              className="blue-button"
              type="button"
              disabled={selectedTask.customers.length === 0}
              onClick={() => handleOpenTaskCustomerDetails(selectedTask)}
            >
              Müşterilerin Detayı
            </button>
          </section>
        </div>
      ) : null}

      {selectedCustomerTask ? (
        <div className="customer-modal-backdrop" role="presentation">
          <section
            className="customer-modal customer-modal-wide"
            role="dialog"
            aria-modal="true"
          >
            <div className="customer-modal-header">
              <h2>Müşteri Detayları</h2>
              <button
                className="customer-modal-close"
                type="button"
                onClick={handleCloseCustomerDetails}
              >
                Kapat
              </button>
            </div>

            <div className="permission-table-scroll">
              <table className="permission-table customer-table">
                <thead>
                  <tr>
                    <th>ad soyad</th>
                    <th>unvan</th>
                    <th>durum</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCustomerTask.customers.length === 0 ? (
                    <tr>
                      <td colSpan={4}>Kayıt bulunamadı.</td>
                    </tr>
                  ) : null}

                  {selectedCustomerTask.customers.map((customer) => (
                    <tr
                      className="clickable-table-row"
                      key={customer.uuid}
                      onClick={() => void handleOpenCustomerDetail(customer)}
                    >
                      <td>
                        {taskCustomerFullName(customer.ad, customer.soyad)}
                      </td>
                      <td>{customer.unvan || "-"}</td>
                      <td>{formatTaskStatus(customer.status)}</td>
                      <td>
                        <div className="customer-action-group">
                          {canTaskCustomerOpenFollowRecord(
                            selectedCustomerTask,
                            customer,
                            userId,
                          ) ? (
                            <button
                              className="customer-action-button task-follow-button"
                              type="button"
                              aria-label="Takip kaydı oluştur"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleOpenFollowRecordModal(
                                  selectedCustomerTask,
                                  customer,
                                );
                              }}
                            >
                              ✎
                            </button>
                          ) : null}
                          <button
                            className="customer-action-button task-cancel-button"
                            type="button"
                            disabled={
                              !canCancelTasks ||
                              !canTaskCustomerBeCancelled(customer) ||
                              cancellingTaskCustomerUuid === customer.uuid
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleCancelTaskCustomer(
                                selectedCustomerTask,
                                customer,
                              );
                            }}
                          >
                            ⓧ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {selectedFollowRecord ? (
        <div className="customer-modal-backdrop" role="presentation">
          <section
            className="customer-modal customer-modal-wide"
            role="dialog"
            aria-modal="true"
          >
            <div className="customer-modal-header">
              <h2>Takip Kaydı</h2>
              <button
                className="customer-modal-close"
                type="button"
                onClick={handleCloseFollowRecordModal}
              >
                Kapat
              </button>
            </div>
            <hr className="hr-line-grid" />

            <form className="customer-entry-form" onSubmit={handleFollowUpSubmit}>
              <div className="customer-detail-grid task-assign-form-wide">
                <span>Görev</span>
                <strong>
                  {selectedFollowRecord.task.title || "Potansiyel Müşteri"}
                </strong>
                <span>Müşteri</span>
                <strong>
                  {taskCustomerFullName(
                    selectedFollowRecord.customer.ad,
                    selectedFollowRecord.customer.soyad,
                  )}
                </strong>
              </div>
              <h3 className="task-assign-form-wide">Ziyaret Bilgileri</h3>
              <label className="field-label">
                  Görüşme Tarihi*
                  <input
                    className="panel-input"
                    type="date"
                    min={todayDateInputValue()}
                    value={followUpForm.visitDate}
                    onChange={(event) =>
                      updateFollowUpForm("visitDate", event.target.value)
                    }
                  />
                  {followUpErrors.visitDate ? (
                    <span className="customer-field-error">
                      {followUpErrors.visitDate}
                    </span>
                  ) : null}
              </label>
              <label className="field-label">
                  Bir Sonraki Ziyaret Tarihi*
                  <input
                    className="panel-input"
                    type="date"
                    min={followUpForm.visitDate}
                    value={followUpForm.nextVisitDate}
                    onChange={(event) =>
                      updateFollowUpForm("nextVisitDate", event.target.value)
                    }
                  />
                  {followUpErrors.nextVisitDate ? (
                    <span className="customer-field-error">
                      {followUpErrors.nextVisitDate}
                    </span>
                  ) : null}
              </label>
              <label className="field-label">
                Görüşme Türü*
                <select
                  className="panel-input"
                  value={followUpForm.visitType}
                  onChange={(event) =>
                    updateFollowUpForm(
                      "visitType",
                      event.target.value as FollowUpVisitType | "",
                    )
                  }
                >
                  <option value="">Seçiniz</option>
                  {followUpVisitTypes.map((visitType) => (
                    <option key={visitType} value={visitType}>
                      {visitType}
                    </option>
                  ))}
                </select>
                {followUpErrors.visitType ? (
                  <span className="customer-field-error">
                    {followUpErrors.visitType}
                  </span>
                ) : null}
              </label>

              <h3 className="task-assign-form-wide">Görüşülen Kişi Bilgileri</h3>
              <label className="field-label">
                Görevi*
                <select
                  className="panel-input"
                  value={followUpForm.meetPersonTitle}
                  onChange={(event) =>
                    updateFollowUpForm(
                      "meetPersonTitle",
                      event.target.value as FollowUpMeetPersonTitle | "",
                    )
                  }
                >
                  <option value="">Seçiniz</option>
                  {followUpMeetPersonTitles.map((title) => (
                    <option key={title} value={title}>
                      {title}
                    </option>
                  ))}
                </select>
                {followUpErrors.meetPersonTitle ? (
                  <span className="customer-field-error">
                    {followUpErrors.meetPersonTitle}
                  </span>
                ) : null}
              </label>
              <label className="field-label">
                  Ad*
                  <input
                    className="panel-input"
                    value={followUpForm.meetPersonName}
                    maxLength={50}
                    onChange={(event) =>
                      updateFollowUpForm("meetPersonName", event.target.value)
                    }
                  />
                  {followUpErrors.meetPersonName ? (
                    <span className="customer-field-error">
                      {followUpErrors.meetPersonName}
                    </span>
                  ) : null}
              </label>
              <label className="field-label">
                  Soyad*
                  <input
                    className="panel-input"
                    value={followUpForm.meetPersonSurname}
                    maxLength={50}
                    onChange={(event) =>
                      updateFollowUpForm("meetPersonSurname", event.target.value)
                    }
                  />
                  {followUpErrors.meetPersonSurname ? (
                    <span className="customer-field-error">
                      {followUpErrors.meetPersonSurname}
                    </span>
                  ) : null}
              </label>
              <label className="field-label">
                  Telefon*
                  <input
                    className="panel-input"
                    inputMode="tel"
                    pattern="05[0-9]{9}"
                    placeholder="05XXXXXXXXX"
                    type="tel"
                    value={followUpForm.meetPersonPhone}
                    maxLength={11}
                    onChange={(event) =>
                      updateFollowUpForm("meetPersonPhone", event.target.value)
                    }
                  />
                  {followUpErrors.meetPersonPhone ? (
                    <span className="customer-field-error">
                      {followUpErrors.meetPersonPhone}
                    </span>
                  ) : null}
              </label>
              <label className="field-label">
                  Eposta*
                  <input
                    className="panel-input"
                    type="email"
                    value={followUpForm.meetPersonEmail}
                    maxLength={100}
                    onChange={(event) =>
                      updateFollowUpForm("meetPersonEmail", event.target.value)
                    }
                  />
                  {followUpErrors.meetPersonEmail ? (
                    <span className="customer-field-error">
                      {followUpErrors.meetPersonEmail}
                    </span>
                  ) : null}
              </label>

              <h3 className="task-assign-form-wide">Anlaşma Bilgileri</h3>
              <label className="field-label">
                Anlaşma Sağlandı mı?
                <select
                  className="panel-input"
                  value={followUpForm.agreementReached ? "true" : "false"}
                  onChange={(event) =>
                    updateFollowUpForm(
                      "agreementReached",
                      event.target.value === "true",
                    )
                  }
                >
                  <option value="false">Hayır</option>
                  <option value="true">Evet</option>
                </select>
              </label>
              {!followUpForm.agreementReached ? (
                <label className="field-label">
                  Anlaşamama Sebebi*
                  <select
                    className="panel-input"
                    value={followUpForm.agreementFailureReason}
                    onChange={(event) =>
                      updateFollowUpForm(
                        "agreementFailureReason",
                        event.target
                          .value as FollowUpAgreementFailureReason | "",
                      )
                    }
                  >
                    <option value="">Seçiniz</option>
                    {followUpAgreementFailureReasons.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                  {followUpErrors.agreementFailureReason ? (
                    <span className="customer-field-error">
                      {followUpErrors.agreementFailureReason}
                    </span>
                  ) : null}
                </label>
              ) : null}
              <label className="field-label task-assign-form-wide">
                Not
                <textarea
                  className="panel-input"
                  value={followUpForm.note}
                  maxLength={150}
                  onChange={(event) =>
                    updateFollowUpForm("note", event.target.value)
                  }
                />
                {followUpErrors.note ? (
                  <span className="customer-field-error">
                    {followUpErrors.note}
                  </span>
                ) : null}
              </label>

              <h3 className="task-assign-form-wide">Resim</h3>
              <label className="field-label task-assign-form-wide">
                Maksimum 3 Resim
                <span className="follow-up-upload-box">
                  <input
                    className="follow-up-upload-input"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    onChange={(event) =>
                      handleFollowUpImageChange(event.target.files)
                    }
                  />
                  <span className="follow-up-upload-title">
                    Resim seçmek için tıklayın
                  </span>
                  <span className="follow-up-upload-help">
                    JPEG, PNG, JPG, GIF veya WebP. Maksimum 3 resim, toplam 5 MB.
                  </span>
                </span>
                {followUpErrors.images ? (
                  <span className="customer-field-error">
                    {followUpErrors.images}
                  </span>
                ) : null}
              </label>
              {followUpForm.images.length > 0 ? (
                <ul className="follow-up-upload-list task-assign-form-wide">
                  {followUpForm.images.map((image) => (
                    <li key={`${image.name}-${image.size}`}>
                      <span>{image.name}</span>
                      <span>{formatFileSize(image.size)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {followUpErrors.form ? (
                <p className="customer-field-error task-assign-form-wide">
                  {followUpErrors.form}
                </p>
              ) : null}
              <div className="customer-modal-actions">
                <button
                  className="gray-button"
                  type="button"
                  disabled={isCreatingFollowUp}
                  onClick={handleCloseFollowRecordModal}
                >
                  Vazgeç
                </button>
                <button
                  className="blue-button"
                  type="submit"
                  disabled={isCreatingFollowUp}
                >
                  {isCreatingFollowUp ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {selectedCustomerDetail || isLoadingCustomerDetail ? (
        <div className="customer-modal-backdrop" role="presentation">
          <section
            className="customer-modal customer-modal-wide"
            role="dialog"
            aria-modal="true"
          >
            <div className="customer-modal-header">
              <h2>Müşteri Bilgileri</h2>
              <button
                className="customer-modal-close"
                type="button"
                onClick={handleCloseCustomerDetail}
              >
                Kapat
              </button>
            </div>

            {isLoadingCustomerDetail ? (
              <p className="muted-text">Müşteri detayı yükleniyor...</p>
            ) : selectedCustomerDetail ? (
              <div className="customer-detail-grid">
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
                <span>E-posta</span>
                <strong>{selectedCustomerDetail.eposta || "-"}</strong>
                <span>Website</span>
                <strong>{selectedCustomerDetail.website || "-"}</strong>
                <span>Google Map Link</span>
                <strong>{selectedCustomerDetail.googleMapLink || "-"}</strong>
                <span>İlan Sitesi Link</span>
                <strong>
                  {selectedCustomerDetail.classifiedsWebsiteLink || "-"}
                </strong>
                <span>Mahalle</span>
                <strong>{selectedCustomerDetail.mahalle || "-"}</strong>
                <span>Adres Detayı</span>
                <strong>{selectedCustomerDetail.addressDetail || "-"}</strong>
                <span>İl Kodu</span>
                <strong>{selectedCustomerDetail.ilKodu || "-"}</strong>
                <span>İlçe Kodu</span>
                <strong>{selectedCustomerDetail.ilceKodu || "-"}</strong>
                <span>Vergi No</span>
                <strong>{selectedCustomerDetail.vergiNo || "-"}</strong>
                <span>Vergi Dairesi</span>
                <strong>{selectedCustomerDetail.vergiDairesi || "-"}</strong>
                <span>T.C. No</span>
                <strong>{selectedCustomerDetail.tcNo || "-"}</strong>
                <span>Doğum Tarihi</span>
                <strong>
                  {formatDate(selectedCustomerDetail.dogumTarihi)}
                </strong>
                <span>Araç Stok Sayısı</span>
                <strong>
                  {selectedCustomerDetail.vehicleStockCount ?? "-"}
                </strong>
                <span>Kurumsal Sektör</span>
                <strong>{selectedCustomerDetail.corporateSector || "-"}</strong>
                <span>Müşteri Türü</span>
                <strong>
                  {formatCustomerType(selectedCustomerDetail.type)}
                </strong>
                <span>Kayıt Tarihi</span>
                <strong>{formatDate(selectedCustomerDetail.createdAt)}</strong>
                <span>Telefonlar</span>
                <strong>
                  {formatCustomerTelephones(selectedCustomerDetail.telephones)}
                </strong>
              </div>
            ) : null}
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
              <th>Müşteri Sayısı</th>
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
              <th />
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
                <td colSpan={9}>Kayıt bulunamadı.</td>
              </tr>
            ) : null}

            {items.map((task) => {
              return (
                <tr key={task.uuid}>
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
                    </div>
                  </td>
                  <td>{task.title || "Potansiyel Müşteri"}</td>
                  <td>{task.customerCount}</td>
                  <td>{task.assignedUserFullName || "-"}</td>
                  <td>{task.branchName || "-"}</td>
                  <td>{formatDate(task.visitDate)}</td>
                  <td>{formatDate(task.dueDate)}</td>
                  <td>{formatTaskPriority(task.priority)}</td>
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

function taskCustomerFullName(ad: string, soyad: string): string {
  return `${ad} ${soyad}`.trim() || "-";
}

function validateFollowUpForm(form: FollowUpForm): FollowUpFormErrors {
  const errors: FollowUpFormErrors = {};

  if (!form.visitDate) {
    errors.visitDate = "Görüşme tarihi zorunludur.";
  }
  if (!form.nextVisitDate) {
    errors.nextVisitDate = "Bir sonraki ziyaret tarihi zorunludur.";
  }
  if (form.visitDate && form.nextVisitDate && form.nextVisitDate < form.visitDate) {
    errors.nextVisitDate =
      "Bir sonraki ziyaret tarihi görüşme tarihinden önce olamaz.";
  }
  if (!form.visitType) {
    errors.visitType = "Görüşme türü zorunludur.";
  }
  if (!form.meetPersonTitle) {
    errors.meetPersonTitle = "Görev zorunludur.";
  }
  if (!form.meetPersonName.trim()) {
    errors.meetPersonName = "Ad zorunludur.";
  }
  if (!form.meetPersonSurname.trim()) {
    errors.meetPersonSurname = "Soyad zorunludur.";
  }
  if (!form.meetPersonPhone.trim()) {
    errors.meetPersonPhone = "Telefon zorunludur.";
  } else if (!/^05[0-9]{9}$/.test(form.meetPersonPhone.trim())) {
    errors.meetPersonPhone = "Telefon 05XXXXXXXXX formatında olmalıdır.";
  }
  if (!form.meetPersonEmail.trim()) {
    errors.meetPersonEmail = "Eposta zorunludur.";
  }
  if (!form.agreementReached && !form.agreementFailureReason) {
    errors.agreementFailureReason = "Anlaşamama sebebi zorunludur.";
  }
  if (form.note.trim().length > 150) {
    errors.note = "Not en fazla 150 karakter olabilir.";
  }
  if (form.images.length > 3) {
    errors.images = "En fazla 3 resim yüklenebilir.";
  }

  const totalImageSize = form.images.reduce((total, image) => total + image.size, 0);
  if (totalImageSize > followUpMaxImageTotalSize) {
    errors.images = "Resimlerin toplam boyutu en fazla 5 MB olabilir.";
  }
  if (form.images.some((image) => !followUpImageTypes.has(image.type))) {
    errors.images = "Sadece JPEG, PNG, JPG, GIF veya WebP dosyaları yüklenebilir.";
  }

  return errors;
}

function apiFollowUpErrorsToFormErrors(
  errors: Record<string, string>,
): FollowUpFormErrors {
  const formErrors: FollowUpFormErrors = {};

  for (const [field, message] of Object.entries(errors)) {
    switch (field) {
      case "visit_date":
        formErrors.visitDate = message;
        break;
      case "next_visit_date":
        formErrors.nextVisitDate = message;
        break;
      case "visit_type":
        formErrors.visitType = message;
        break;
      case "agreement_failure_reason":
        formErrors.agreementFailureReason = message;
        break;
      case "note":
        formErrors.note = message;
        break;
      case "images":
        formErrors.images = message;
        break;
      case "meet_people.0.title":
        formErrors.meetPersonTitle = message;
        break;
      case "meet_people.0.name":
        formErrors.meetPersonName = message;
        break;
      case "meet_people.0.surname":
        formErrors.meetPersonSurname = message;
        break;
      case "meet_people.0.phone":
        formErrors.meetPersonPhone = message;
        break;
      case "meet_people.0.email":
        formErrors.meetPersonEmail = message;
        break;
      default:
        formErrors.form = message;
        break;
    }
  }

  return formErrors;
}

function canTaskCustomerBeCancelled(customer: TaskCustomer): boolean {
  return customer.status !== "cancelled" && customer.status !== "completed";
}

function canTaskCustomerOpenFollowRecord(
  task: TaskListItem,
  customer: TaskCustomer,
  userId: number,
): boolean {
  return (
    task.assignedUserId === userId &&
    (customer.status === "pending" || customer.status === "in_progress")
  );
}

function todayDateInputValue(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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

function formatCustomerTelephones(
  telephones: CustomerDetail["telephones"],
): string {
  if (telephones.length === 0) {
    return "-";
  }

  return telephones
    .map((telephone) =>
      [telephone.title, telephone.phoneNumber].filter(Boolean).join(": "),
    )
    .join(", ");
}

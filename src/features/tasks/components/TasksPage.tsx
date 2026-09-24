import { FormEvent, useCallback, useMemo, useRef, useState } from "react";

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
  type TaskPriority,
  type TaskStatus,
} from "@/features/tasks/services/taskApi";
import {
  TasksDataTable,
  type TasksDataTableHandle,
  type TasksListMeta,
} from "@/features/tasks/components/TasksDataTable";
import { ContentHeader } from "@/shared/components/ContentHeader";
import { ControlledModal } from "@/shared/components/ControlledModal";
import { ListTableToolbar, TableActionGroup, TableIconButton } from "@/shared/components";
import { formFieldProps } from "@/shared/utils/formFieldProps";

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
  meetPeople: FollowUpMeetPersonForm[];
  agreementReached: boolean;
  agreementFailureReason: FollowUpAgreementFailureReason | "";
  note: string;
  images: File[];
};

type FollowUpMeetPersonForm = {
  id: string;
  title: FollowUpMeetPersonTitle | "";
  name: string;
  surname: string;
  phone: string;
  email: string;
};

type FollowUpMeetPersonField = keyof Omit<FollowUpMeetPersonForm, "id">;

type FollowUpFormErrors = Record<string, string | undefined>;

type FollowUpCompanyInfo = {
  plusCardNo: string;
  credit: string;
  point: string;
};

const emptyListMeta: TasksListMeta = {
  total: 0,
  currentPage: 1,
  lastPage: 1,
};

const emptyFollowUpCompanyInfo: FollowUpCompanyInfo = {
  plusCardNo: "",
  credit: "",
  point: "",
};

function createEmptyFollowUpForm(): FollowUpForm {
  const today = todayDateInputValue();

  return {
    visitDate: today,
    nextVisitDate: "",
    visitType: "Yerinde Ziyaret",
    meetPeople: [createEmptyFollowUpMeetPerson()],
    agreementReached: false,
    agreementFailureReason: "",
    note: "",
    images: [],
  };
}

function createEmptyFollowUpMeetPerson(): FollowUpMeetPersonForm {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: "",
    name: "",
    surname: "",
    phone: "",
    email: "",
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

  const tableRef = useRef<TasksDataTableHandle>(null);
  const [listMeta, setListMeta] = useState<TasksListMeta>(emptyListMeta);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [message, setMessage] = useState("");

  const taskListLoader = useMemo(
    () => (shouldListOnlyAssignedTasks ? listAssignedTasks : listTasks),
    [shouldListOnlyAssignedTasks],
  );

  const handleTableError = useCallback((errorMessage: string) => {
    setMessage(errorMessage);
  }, []);

  const handleLoadMeta = useCallback((meta: TasksListMeta) => {
    setListMeta(meta);
  }, []);
  const [selectedTask, setSelectedTask] = useState<TaskListItem | null>(null);
  const [selectedCustomerTask, setSelectedCustomerTask] =
    useState<TaskListItem | null>(null);
  const [selectedCustomerDetail, setSelectedCustomerDetail] =
    useState<CustomerDetail | null>(null);
  const [selectedFollowRecord, setSelectedFollowRecord] =
    useState<FollowRecordSelection | null>(null);
  const [followUpCompanyInfo, setFollowUpCompanyInfo] =
    useState<FollowUpCompanyInfo>(emptyFollowUpCompanyInfo);
  const [isLoadingFollowUpCompanyInfo, setIsLoadingFollowUpCompanyInfo] =
    useState(false);
  const [followUpCompanyInfoMessage, setFollowUpCompanyInfoMessage] =
    useState("");
  const [followUpForm, setFollowUpForm] =
    useState<FollowUpForm>(() => createEmptyFollowUpForm());
  const [followUpErrors, setFollowUpErrors] = useState<FollowUpFormErrors>({});
  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false);
  const [isLoadingCustomerDetail, setIsLoadingCustomerDetail] = useState(false);
  const [cancellingTaskCustomerUuid, setCancellingTaskCustomerUuid] =
    useState("");

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setMessage("");
    tableRef.current?.applyFilters();
  }

  function handleResetFilters(): void {
    setMessage("");
    tableRef.current?.clearFilters();
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

  async function handleOpenFollowRecordModal(
    task: TaskListItem,
    customer: TaskCustomer,
  ): Promise<void> {
    if (!canTaskCustomerOpenFollowRecord(task, customer, userId)) {
      return;
    }

    setFollowUpForm(createEmptyFollowUpForm());
    setFollowUpErrors({});
    setFollowUpCompanyInfo(emptyFollowUpCompanyInfo);
    setFollowUpCompanyInfoMessage("");
    setSelectedFollowRecord({ task, customer });
    setMessage("");

    const uoID = Number(customer.uoId);
    if (!customer.uoId.trim() || !Number.isFinite(uoID) || uoID <= 0) {
      return;
    }

    setIsLoadingFollowUpCompanyInfo(true);
    try {
      const customerDetail = await getCustomer(uoID, "umramonline");
      setFollowUpCompanyInfo({
        plusCardNo: customerDetail.plusCardNo,
        credit: customerDetail.credit,
        point: customerDetail.point,
      });
    } catch {
      setFollowUpCompanyInfo(emptyFollowUpCompanyInfo);
      setFollowUpCompanyInfoMessage("PlusCard bilgileri getirilemedi.");
    } finally {
      setIsLoadingFollowUpCompanyInfo(false);
    }
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
        nextForm.nextVisitDate &&
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

  function updateFollowUpMeetPerson(
    personID: string,
    field: FollowUpMeetPersonField,
    value: string,
  ): void {
    setFollowUpForm((current) => ({
      ...current,
      meetPeople: current.meetPeople.map((person) =>
        person.id === personID
          ? {
              ...person,
              [field]: value,
            }
          : person,
      ),
    }));
    setFollowUpErrors((current) => ({
      ...current,
      [followUpMeetPersonErrorKey(personID, field)]: "",
      form: "",
    }));
  }

  function addFollowUpMeetPerson(): void {
    setFollowUpForm((current) => ({
      ...current,
      meetPeople: [...current.meetPeople, createEmptyFollowUpMeetPerson()],
    }));
    setFollowUpErrors((current) => ({
      ...current,
      meetPeople: "",
      form: "",
    }));
  }

  function removeFollowUpMeetPerson(personID: string): void {
    setFollowUpForm((current) => {
      if (current.meetPeople.length <= 1) {
        return current;
      }

      return {
        ...current,
        meetPeople: current.meetPeople.filter((person) => person.id !== personID),
      };
    });
    setFollowUpErrors((current) => ({
      ...current,
      meetPeople: "",
      form: "",
    }));
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
      scrollToFirstFollowUpError(validationErrors);
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
        meetPeople: followUpForm.meetPeople.map((person) => ({
          title: person.title,
          name: person.name.trim(),
          surname: person.surname.trim(),
          phone: person.phone.trim(),
          email: person.email.trim(),
        })),
        images: followUpForm.images,
      });
      const nextStatus: TaskStatus = followUpForm.nextVisitDate.trim()
        ? "in_progress"
        : "completed";
      const updateTaskCustomerStatus = (
        currentTask: TaskListItem,
      ): TaskListItem => ({
        ...currentTask,
        customers: currentTask.customers.map((currentCustomer) =>
          currentCustomer.uuid === selectedFollowRecord.customer.uuid
            ? {
                ...currentCustomer,
                status: nextStatus,
              }
            : currentCustomer,
        ),
      });

      setSelectedCustomerTask((current) =>
        current?.uuid === selectedFollowRecord.task.uuid
          ? updateTaskCustomerStatus(current)
          : current,
      );
      tableRef.current?.refresh();
      setSelectedFollowRecord(null);
      setFollowUpForm(createEmptyFollowUpForm());
      setFollowUpCompanyInfo(emptyFollowUpCompanyInfo);
      setFollowUpCompanyInfoMessage("");
      setIsLoadingFollowUpCompanyInfo(false);
      setMessage("Takip kaydı oluşturuldu.");
    } catch (error: unknown) {
      if (error instanceof FollowUpValidationError) {
        const validationErrors = apiFollowUpErrorsToFormErrors(
          error.errors,
          followUpForm.meetPeople,
        );
        setFollowUpErrors(validationErrors);
        scrollToFirstFollowUpError(validationErrors);
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
      tableRef.current?.refresh();
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
    setFollowUpCompanyInfo(emptyFollowUpCompanyInfo);
    setFollowUpCompanyInfoMessage("");
    setIsLoadingFollowUpCompanyInfo(false);
    setIsCreatingFollowUp(false);
  }

  if (!canListTasks) {
    return (
      <>
        <ContentHeader
          title="Tüm Görevler"
          breadcrumbs={[
            { label: "Ana Sayfa", href: "/home" },
            { label: "Tüm Görevler", active: true },
          ]}
        />
        <section className="card mb-3">
          <div className="card-body">
            <p className="text-muted small mb-0">
              Görev listesini görüntüleme yetkiniz yok.
            </p>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <ContentHeader
        title="Tüm Görevler"
        breadcrumbs={[
          { label: "Ana Sayfa", href: "/home" },
          { label: "Tüm Görevler", active: true },
        ]}
      />
      <section className="card list-table-card mb-3">
      {selectedTask ? (
        <ControlledModal
          isOpen
          onClose={() => setSelectedTask(null)}
          title="Görev Detayı"
          size="xl"
        >
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
              className="btn btn-primary btn-sm"
              type="button"
              disabled={selectedTask.customers.length === 0}
              onClick={() => handleOpenTaskCustomerDetails(selectedTask)}
            >
              Müşterilerin Detayı
            </button>
        </ControlledModal>
      ) : null}

      {selectedCustomerTask ? (
        <ControlledModal
          isOpen
          onClose={handleCloseCustomerDetails}
          title="Görevin Müşteri Detayları"
          size="xl"
        >
            <div className="table-responsive">
              <table className="table table-striped table-hover table-sm mb-0">
                <thead>
                  <tr>
                    <th>ad soyad</th>
                    <th>unvan</th>
                    <th>durum</th>
                    <th className="table-actions-cell">İşlemler</th>
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
                      <td className="table-actions-cell">
                        <TableActionGroup label="Görev müşteri işlemleri">
                          {canTaskCustomerOpenFollowRecord(
                            selectedCustomerTask,
                            customer,
                            userId,
                          ) ? (
                            <TableIconButton
                              action="createFollowUp"
                              label="Takip kaydı oluştur"
                              variant="success"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleOpenFollowRecordModal(
                                  selectedCustomerTask,
                                  customer,
                                );
                              }}
                            />
                          ) : null}
                          <TableIconButton
                            action="cancelRecord"
                            label="Görev müşterisini iptal et"
                            variant="danger"
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
                          />
                        </TableActionGroup>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </ControlledModal>
      ) : null}

      {selectedFollowRecord ? (
        <ControlledModal
          isOpen
          onClose={handleCloseFollowRecordModal}
          title="Takip Kaydı"
          size="xl"
        >
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
                    {...formFieldProps("tasks-follow-up", "visitDate", {
                      label: "Görüşme Tarihi",
                    })}
                    className="form-control form-control-sm"
                    type="date"
                    data-follow-up-error-field="visitDate"
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
                  Bir Sonraki Ziyaret Tarihi
                  <input
                    {...formFieldProps("tasks-follow-up", "nextVisitDate", {
                      label: "Bir Sonraki Ziyaret Tarihi",
                    })}
                    className="form-control form-control-sm"
                    type="date"
                    data-follow-up-error-field="nextVisitDate"
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
                  {...formFieldProps("tasks-follow-up", "visitType", {
                    label: "Görüşme Türü",
                  })}
                  className="form-control form-control-sm"
                  data-follow-up-error-field="visitType"
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
              <div
                className="follow-up-meet-people task-assign-form-wide"
                data-follow-up-error-field="meetPeople"
                tabIndex={-1}
              >
                {followUpForm.meetPeople.map((person, index) => (
                  <div className="follow-up-meet-person-card" key={person.id}>
                    <div className="follow-up-meet-person-header">
                      <strong>Görüşülen Kişi {index + 1}</strong>
                      <button
                        className="btn btn-secondary btn-sm"
                        type="button"
                        disabled={followUpForm.meetPeople.length <= 1}
                        onClick={() => removeFollowUpMeetPerson(person.id)}
                      >
                        Sil
                      </button>
                    </div>
                    <label className="field-label">
                      Görevi*
                      <select
                        {...formFieldProps("tasks-follow-up", "meetPersonTitle", {
                          label: "Görevi",
                          suffix: person.id,
                        })}
                        className="form-control form-control-sm"
                        data-follow-up-error-field={followUpMeetPersonErrorKey(
                          person.id,
                          "title",
                        )}
                        value={person.title}
                        onChange={(event) =>
                          updateFollowUpMeetPerson(
                            person.id,
                            "title",
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
                      {followUpErrors[
                        followUpMeetPersonErrorKey(person.id, "title")
                      ] ? (
                        <span className="customer-field-error">
                          {
                            followUpErrors[
                              followUpMeetPersonErrorKey(person.id, "title")
                            ]
                          }
                        </span>
                      ) : null}
                    </label>
                    <label className="field-label">
                      Ad*
                      <input
                        {...formFieldProps("tasks-follow-up", "meetPersonName", {
                          label: "Ad",
                          suffix: person.id,
                        })}
                        className="form-control form-control-sm"
                        data-follow-up-error-field={followUpMeetPersonErrorKey(
                          person.id,
                          "name",
                        )}
                        value={person.name}
                        maxLength={50}
                        onChange={(event) =>
                          updateFollowUpMeetPerson(
                            person.id,
                            "name",
                            event.target.value,
                          )
                        }
                      />
                      {followUpErrors[
                        followUpMeetPersonErrorKey(person.id, "name")
                      ] ? (
                        <span className="customer-field-error">
                          {
                            followUpErrors[
                              followUpMeetPersonErrorKey(person.id, "name")
                            ]
                          }
                        </span>
                      ) : null}
                    </label>
                    <label className="field-label">
                      Soyad*
                      <input
                        {...formFieldProps("tasks-follow-up", "meetPersonSurname", {
                          label: "Soyad",
                          suffix: person.id,
                        })}
                        className="form-control form-control-sm"
                        data-follow-up-error-field={followUpMeetPersonErrorKey(
                          person.id,
                          "surname",
                        )}
                        value={person.surname}
                        maxLength={50}
                        onChange={(event) =>
                          updateFollowUpMeetPerson(
                            person.id,
                            "surname",
                            event.target.value,
                          )
                        }
                      />
                      {followUpErrors[
                        followUpMeetPersonErrorKey(person.id, "surname")
                      ] ? (
                        <span className="customer-field-error">
                          {
                            followUpErrors[
                              followUpMeetPersonErrorKey(person.id, "surname")
                            ]
                          }
                        </span>
                      ) : null}
                    </label>
                    <label className="field-label">
                      Telefon*
                      <input
                        {...formFieldProps("tasks-follow-up", "meetPersonPhone", {
                          label: "Telefon",
                          suffix: person.id,
                        })}
                        className="form-control form-control-sm"
                        data-follow-up-error-field={followUpMeetPersonErrorKey(
                          person.id,
                          "phone",
                        )}
                        inputMode="tel"
                        pattern="05[0-9]{9}"
                        placeholder="05XXXXXXXXX"
                        type="tel"
                        value={person.phone}
                        maxLength={11}
                        onChange={(event) =>
                          updateFollowUpMeetPerson(
                            person.id,
                            "phone",
                            event.target.value,
                          )
                        }
                      />
                      {followUpErrors[
                        followUpMeetPersonErrorKey(person.id, "phone")
                      ] ? (
                        <span className="customer-field-error">
                          {
                            followUpErrors[
                              followUpMeetPersonErrorKey(person.id, "phone")
                            ]
                          }
                        </span>
                      ) : null}
                    </label>
                    <label className="field-label">
                      Eposta
                      <input
                        {...formFieldProps("tasks-follow-up", "meetPersonEmail", {
                          label: "Eposta",
                          suffix: person.id,
                        })}
                        className="form-control form-control-sm"
                        type="email"
                        data-follow-up-error-field={followUpMeetPersonErrorKey(
                          person.id,
                          "email",
                        )}
                        value={person.email}
                        maxLength={100}
                        onChange={(event) =>
                          updateFollowUpMeetPerson(
                            person.id,
                            "email",
                            event.target.value,
                          )
                        }
                      />
                      {followUpErrors[
                        followUpMeetPersonErrorKey(person.id, "email")
                      ] ? (
                        <span className="customer-field-error">
                          {
                            followUpErrors[
                              followUpMeetPersonErrorKey(person.id, "email")
                            ]
                          }
                        </span>
                      ) : null}
                    </label>
                  </div>
                ))}
                {followUpErrors.meetPeople ? (
                  <span className="customer-field-error">
                    {followUpErrors.meetPeople}
                  </span>
                ) : null}
                <button
                  className="btn btn-primary btn-sm follow-up-add-person-button"
                  type="button"
                  onClick={addFollowUpMeetPerson}
                >
                  Kişi Ekle
                </button>
              </div>

              <h3 className="task-assign-form-wide">Firma Bilgileri</h3>
              <div className="customer-detail-grid task-assign-form-wide">
                <span>Firma Adı</span>
                <strong>{selectedFollowRecord.customer.unvan || "-"}</strong>
                <span>E-posta</span>
                <strong>{selectedFollowRecord.customer.eposta || "-"}</strong>
                <span>Pluscard No</span>
                <strong>
                  {isLoadingFollowUpCompanyInfo
                    ? "Yükleniyor..."
                    : followUpCompanyInfo.plusCardNo || "-"}
                </strong>
                <span>PlusCard Kredi</span>
                <strong>
                  {isLoadingFollowUpCompanyInfo
                    ? "Yükleniyor..."
                    : followUpCompanyInfo.credit || "-"}
                </strong>
                <span>Pluscard Puan</span>
                <strong>
                  {isLoadingFollowUpCompanyInfo
                    ? "Yükleniyor..."
                    : followUpCompanyInfo.point || "-"}
                </strong>
                <span>Araç Stok Adedi</span>
                <strong>
                  {selectedFollowRecord.customer.vehicleStockCount ?? "-"}
                </strong>
              </div>
              {followUpCompanyInfoMessage ? (
                <p className="customer-field-error task-assign-form-wide">
                  {followUpCompanyInfoMessage}
                </p>
              ) : null}

              <h3 className="task-assign-form-wide">Anlaşma Bilgileri</h3>
              <label className="field-label">
                Anlaşma Sağlandı mı?
                <select
                  {...formFieldProps("tasks-follow-up", "agreementReached", {
                    label: "Anlaşma Sağlandı mı?",
                  })}
                  className="form-control form-control-sm"
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
                    {...formFieldProps("tasks-follow-up", "agreementFailureReason", {
                      label: "Anlaşamama Sebebi",
                    })}
                    className="form-control form-control-sm"
                    data-follow-up-error-field="agreementFailureReason"
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
                  {...formFieldProps("tasks-follow-up", "note", {
                    label: "Not",
                  })}
                  className="form-control form-control-sm"
                  data-follow-up-error-field="note"
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
                <span className="follow-up-upload-box">
                  <input
                    {...formFieldProps("tasks-follow-up", "images", {
                      label: "Resim",
                    })}
                    className="follow-up-upload-input"
                    type="file"
                    data-follow-up-error-field="images"
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
                  className="btn btn-secondary btn-sm"
                  type="button"
                  disabled={isCreatingFollowUp}
                  onClick={handleCloseFollowRecordModal}
                >
                  Vazgeç
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  type="submit"
                  disabled={isCreatingFollowUp}
                >
                  {isCreatingFollowUp ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
        </ControlledModal>
      ) : null}

      {selectedCustomerDetail || isLoadingCustomerDetail ? (
        <ControlledModal
          isOpen
          onClose={handleCloseCustomerDetail}
          title="Müşteri Bilgileri"
          size="xl"
        >
            {isLoadingCustomerDetail ? (
              <p className="text-muted small">Müşteri detayı yükleniyor...</p>
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
        </ControlledModal>
      ) : null}

      <form className="customer-filter-form" onSubmit={handleFilterSubmit}>
        <ListTableToolbar>
          <button
            className="btn btn-primary btn-sm"
            type="submit"
            disabled={isTableLoading}
          >
            Filtrele
          </button>
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            disabled={isTableLoading}
            onClick={handleResetFilters}
          >
            Temizle
          </button>
        </ListTableToolbar>

        {message ? (
          <div className="card-body pb-0">
            <p className="alert alert-info py-2 mb-0 customer-message">{message}</p>
          </div>
        ) : null}

        <div className="card-body p-0">
          <TasksDataTable
            ref={tableRef}
            listLoader={taskListLoader}
            canViewTaskDetail={canViewTaskDetail}
            onOpenTaskDetail={(task) => void handleOpenTaskDetail(task)}
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
    </section>
    </>
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
  if (form.visitDate && form.nextVisitDate && form.nextVisitDate < form.visitDate) {
    errors.nextVisitDate =
      "Bir sonraki ziyaret tarihi görüşme tarihinden önce olamaz.";
  }
  if (!form.visitType) {
    errors.visitType = "Görüşme türü zorunludur.";
  }
  if (form.meetPeople.length === 0) {
    errors.meetPeople = "En az bir kişi bilgisi girilmelidir.";
  }
  form.meetPeople.forEach((person) => {
    if (!person.title) {
      errors[followUpMeetPersonErrorKey(person.id, "title")] =
        "Görev zorunludur.";
    }
    if (!person.name.trim()) {
      errors[followUpMeetPersonErrorKey(person.id, "name")] = "Ad zorunludur.";
    }
    if (!person.surname.trim()) {
      errors[followUpMeetPersonErrorKey(person.id, "surname")] =
        "Soyad zorunludur.";
    }
    if (!person.phone.trim()) {
      errors[followUpMeetPersonErrorKey(person.id, "phone")] =
        "Telefon zorunludur.";
    } else if (!/^05[0-9]{9}$/.test(person.phone.trim())) {
      errors[followUpMeetPersonErrorKey(person.id, "phone")] =
        "Telefon 05XXXXXXXXX formatında olmalıdır.";
    }
  });
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
  meetPeople: FollowUpMeetPersonForm[],
): FollowUpFormErrors {
  const formErrors: FollowUpFormErrors = {};

  for (const [field, message] of Object.entries(errors)) {
    const meetPersonField = field.match(
      /^meet_people\.(\d+)\.(title|name|surname|phone|email)$/,
    );
    if (meetPersonField) {
      const personIndex = Number(meetPersonField[1]);
      const personField = meetPersonField[2] as FollowUpMeetPersonField;
      const personID = meetPeople[personIndex]?.id;

      if (personID) {
        formErrors[followUpMeetPersonErrorKey(personID, personField)] = message;
      } else {
        formErrors.meetPeople = message;
      }
      continue;
    }

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
      case "meet_people":
        formErrors.meetPeople = message;
        break;
      default:
        formErrors.form = message;
        break;
    }
  }

  return formErrors;
}

function followUpMeetPersonErrorKey(
  personID: string,
  field: FollowUpMeetPersonField,
): string {
  return `meetPeople.${personID}.${field}`;
}

function scrollToFirstFollowUpError(errors: FollowUpFormErrors): void {
  const firstErrorKey = Object.keys(errors).find((key) => errors[key]);
  if (!firstErrorKey) {
    return;
  }

  window.requestAnimationFrame(() => {
    const target = Array.from(
      document.querySelectorAll<HTMLElement>("[data-follow-up-error-field]"),
    ).find((element) => element.dataset.followUpErrorField === firstErrorKey);

    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });

    const focusTarget =
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLButtonElement
        ? target
        : target.querySelector<HTMLElement>("input, select, textarea, button");

    focusTarget?.focus({ preventScroll: true });
  });
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

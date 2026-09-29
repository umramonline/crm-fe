import { Button } from "@adminlte/react";
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
import { CustomerDetailModalBody } from "@/features/customers/components/CustomerDetailModalBody";
import { FollowUpRecordFormBody } from "@/features/followUps/components/FollowUpRecordFormBody";
import { ContentHeader } from "@/shared/components/ContentHeader";
import { ControlledModal } from "@/shared/components/ControlledModal";
import {
  CrmDetailGrid,
  CrmFormSection,
  ListTableToolbar,
  TableActionGroup,
  TableIconButton,
} from "@/shared/components";

const unrestrictedTaskRoleIds = new Set([30, 60, 63]);
const taskFollowUpFormId = "tasks-follow-up-form";
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
    setSelectedFollowRecord(null);
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
    setSelectedCustomerTask(null);
    setSelectedCustomerDetail(null);
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
          <div className="customer-entry-form">
            <CrmFormSection title="Görev bilgileri">
              <CrmDetailGrid
                items={[
                  {
                    label: "Görev Başlığı",
                    value: selectedTask.title || "Potansiyel Müşteri",
                  },
                  { label: "Açıklama", value: selectedTask.description || "-" },
                  {
                    label: "Atanan Personel",
                    value: selectedTask.assignedUserFullName || "-",
                  },
                  { label: "Müşteri Bayisi", value: selectedTask.branchName || "-" },
                  {
                    label: "Ziyaret Tarihi",
                    value: formatDate(selectedTask.visitDate),
                  },
                  {
                    label: "Son Ziyaret Tarihi",
                    value: formatDate(selectedTask.dueDate),
                  },
                  {
                    label: "Öncelik",
                    value: formatTaskPriority(selectedTask.priority),
                  },
                  {
                    label: "Oluşturan",
                    value: selectedTask.createdByUserFullName || "-",
                  },
                ]}
              />
            </CrmFormSection>
            <div className="d-flex justify-content-end">
              <Button
                theme="primary"
                size="sm"
                type="button"
                disabled={selectedTask.customers.length === 0}
                onClick={() => handleOpenTaskCustomerDetails(selectedTask)}
              >
                Müşterilerin Detayı
              </Button>
            </div>
          </div>
        </ControlledModal>
      ) : null}

      {selectedCustomerTask && !selectedCustomerDetail && !isLoadingCustomerDetail ? (
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
          footer={
            <>
              <Button
                theme="secondary"
                size="sm"
                type="button"
                disabled={isCreatingFollowUp}
                onClick={handleCloseFollowRecordModal}
              >
                Vazgeç
              </Button>
              <Button
                theme="primary"
                size="sm"
                type="submit"
                form={taskFollowUpFormId}
                disabled={isCreatingFollowUp}
              >
                {isCreatingFollowUp ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </>
          }
        >
            <hr className="hr-line-grid" />

            <form
              id={taskFollowUpFormId}
              className="customer-entry-form"
              onSubmit={handleFollowUpSubmit}
              noValidate
            >
              <FollowUpRecordFormBody
                formScope="tasks-follow-up"
                headerSummary={
                  <div className="customer-detail-grid">
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
                }
                visitDate={followUpForm.visitDate}
                nextVisitDate={followUpForm.nextVisitDate}
                visitType={followUpForm.visitType}
                minVisitDate={todayDateInputValue()}
                onVisitDateChange={(value) => updateFollowUpForm("visitDate", value)}
                onNextVisitDateChange={(value) =>
                  updateFollowUpForm("nextVisitDate", value)
                }
                onVisitTypeChange={(value) =>
                  updateFollowUpForm("visitType", value as FollowUpVisitType | "")
                }
                visitDateError={followUpErrors.visitDate}
                nextVisitDateError={followUpErrors.nextVisitDate}
                visitTypeError={followUpErrors.visitType}
                meetPeople={followUpForm.meetPeople.map((person) => ({
                  rowKey: person.id,
                  title: person.title,
                  name: person.name,
                  surname: person.surname,
                  phone: person.phone,
                  email: person.email,
                }))}
                meetPeopleError={followUpErrors.meetPeople}
                meetPersonFieldError={(rowKey, field) =>
                  followUpErrors[
                    followUpMeetPersonErrorKey(rowKey, field as FollowUpMeetPersonField)
                  ]
                }
                onMeetPersonChange={(rowKey, field, value) =>
                  updateFollowUpMeetPerson(
                    rowKey,
                    field as FollowUpMeetPersonField,
                    field === "title"
                      ? (value as FollowUpMeetPersonTitle | "")
                      : value,
                  )
                }
                onAddMeetPerson={addFollowUpMeetPerson}
                onRemoveMeetPerson={removeFollowUpMeetPerson}
                beforeAgreement={
                  <CrmFormSection title="Firma Bilgileri">
                    <div className="customer-detail-grid">
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
                      <p className="text-danger small mb-0 mt-2">{followUpCompanyInfoMessage}</p>
                    ) : null}
                  </CrmFormSection>
                }
                agreementReached={followUpForm.agreementReached}
                agreementFailureReason={followUpForm.agreementFailureReason}
                onAgreementReachedChange={(value) =>
                  updateFollowUpForm("agreementReached", value)
                }
                onAgreementFailureReasonChange={(value) =>
                  updateFollowUpForm(
                    "agreementFailureReason",
                    value as FollowUpAgreementFailureReason | "",
                  )
                }
                agreementFailureReasonError={followUpErrors.agreementFailureReason}
                note={followUpForm.note}
                onNoteChange={(value) => updateFollowUpForm("note", value)}
                noteError={followUpErrors.note}
                newImages={followUpForm.images}
                onNewImagesChange={handleFollowUpImageChange}
                imagesError={followUpErrors.images}
                formError={followUpErrors.form}
              />
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
              <CustomerDetailModalBody
                customer={selectedCustomerDetail}
                detailLevel="full"
                formatCustomerType={formatCustomerType}
                formatDate={formatDate}
              />
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

import { Button } from "@adminlte/react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CustomerEntryModal } from "@/features/customers/components/CustomerEntryModal";
import { CustomerSearchModal } from "@/features/customers/components/CustomerSearchModal";
import {
  CustomersDataTable,
  type CustomersDataTableHandle,
  type CustomersListMeta,
} from "@/features/customers/components/CustomersDataTable";
import { customerEntryTexts, customerTextMaxLength } from "@/features/customers/constants/customerEntryTexts";
import { customerListTexts } from "@/features/customers/constants/customerListTexts";
import {
  getCustomer,
  listBranches,
  listZones,
  type Branch,
  type Customer,
  type CustomerDetail,
  type CustomerListQuery,
  type CustomerValidationErrors,
  type Zone,
} from "@/features/customers/services/customerApi";
import {
  createTaskAssignment,
  listTaskAssignableUsers,
  TaskValidationError,
  type TaskAssignableUser,
} from "@/features/tasks/services/taskApi";
import type { Permission } from "@/features/auth/services/authApi";
import { ContentHeader } from "@/shared/components/ContentHeader";
import { ControlledModal } from "@/shared/components/ControlledModal";
import { ListTableToolbar } from "@/shared/components";
import {
  CrmFormFieldCol,
  CrmFormInput,
  CrmFormSelect,
} from "@/shared/components/CrmFormField";
import { StandaloneFollowUpModal } from "@/features/followUps/components/StandaloneFollowUpModal";
import { navigateToFullRegistration } from "@/shared/utils/navigation";

const taskAssignFormId = "customers-task-assign-form";
const taskPriorityOptions = ["high", "medium", "low"] as const;

const pageText = {
  detailFailed: "Müşteri detayı getirilemedi.",
  detailTitle: "Müşteri Detayı",
  taskAssignButton: "Görev Ata",
  taskAssignTitle: "Görev Ata",
} as const;

type TaskPriority = (typeof taskPriorityOptions)[number];

type TaskAssignForm = {
  title: string;
  description: string;
  assignedUserId: string;
  visitDate: string;
  dueDate: string;
  priority: TaskPriority;
};

const emptyListMeta: CustomersListMeta = {
  total: 0,
  currentPage: 1,
  lastPage: 1,
};

function createEmptyTaskAssignForm(
  defaultDate = formatDateInputValue(new Date()),
): TaskAssignForm {
  return {
    title: "",
    description: "",
    assignedUserId: "",
    visitDate: defaultDate,
    dueDate: defaultDate,
    priority: "medium",
  };
}

type CustomersPageProps = {
  permissions: Permission[];
};

export function CustomersPage({ permissions }: CustomersPageProps) {
  const permissionNames = useMemo(
    () => new Set(permissions.map((permission) => permission.name)),
    [permissions],
  );
  const canListCustomers =
    permissionNames.has("customers.list") ||
    permissionNames.has("customers.list.umramonline") ||
    permissionNames.has("customers.list.backend") ||
    permissionNames.has("customers.list.umramonline.my_branches") ||
    permissionNames.has("customers.list.backend.my_branches");
  const canListZones = permissionNames.has("customers.zones.list");
  const canSearchCustomers = permissionNames.has("customers.search");
  const canViewCustomerDetail =
    permissionNames.has("customers.detail") ||
    permissionNames.has("customers.detail.backend") ||
    permissionNames.has("customers.detail.umramonline");
  const canViewFullRegistration = permissionNames.has(
    "customers.full_registration.detail",
  );
  const canCreateStandaloneFollowUp = permissionNames.has(
    "follow_ups.create.standalone",
  );
  const canCreateCustomers = permissionNames.has("customers.create");
  const canCreateTasks = permissionNames.has("tasks.create");
  const canListCities = permissionNames.has("customers.cities.list");
  const canListTowns = permissionNames.has("customers.towns.list");
  const canListBranches = permissionNames.has("customers.branches.list");

  const tableRef = useRef<CustomersDataTableHandle>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [appliedBranchName, setAppliedBranchName] = useState("");
  const [currentPageCustomers, setCurrentPageCustomers] = useState<Customer[]>(
    [],
  );
  const [listMeta, setListMeta] = useState<CustomersListMeta>(emptyListMeta);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBranchFilterLoading, setIsBranchFilterLoading] = useState(false);
  const [selectedCustomerDetail, setSelectedCustomerDetail] =
    useState<CustomerDetail | null>(null);
  const [standaloneFollowUpCustomer, setStandaloneFollowUpCustomer] =
    useState<Customer | null>(null);
  const [selectedTaskCustomers, setSelectedTaskCustomers] = useState<
    Map<number, Customer>
  >(() => new Map());
  const [isTaskAssignModalOpen, setIsTaskAssignModalOpen] = useState(false);
  const [taskAssignForm, setTaskAssignForm] = useState<TaskAssignForm>(() =>
    createEmptyTaskAssignForm(),
  );
  const [taskAssignErrors, setTaskAssignErrors] =
    useState<CustomerValidationErrors>({});
  const [taskAssignableUsers, setTaskAssignableUsers] = useState<
    TaskAssignableUser[]
  >([]);
  const [isTaskAssignableUsersLoading, setIsTaskAssignableUsersLoading] =
    useState(false);
  const [isCreatingTaskAssignment, setIsCreatingTaskAssignment] =
    useState(false);
  const todayDateInputValue = useMemo(
    () => formatDateInputValue(new Date()),
    [],
  );
  const selectedCustomerIds = useMemo(
    () => new Set(selectedTaskCustomers.keys()),
    [selectedTaskCustomers],
  );
  const hasAppliedBranchFilter = appliedBranchName.trim() !== "";
  const selectedTaskBranch = useMemo(
    () =>
      branches.find((branch) => {
        const branchName = branch.name || branch.title;
        return branchName === appliedBranchName;
      }) ?? null,
    [appliedBranchName, branches],
  );
  const selectedTaskBranchId = selectedTaskBranch?.id ?? null;
  const canSelectTaskCustomers =
    hasAppliedBranchFilter && selectedTaskBranchId !== null;
  const selectedTaskCustomerCount = selectedTaskCustomers.size;
  const selectedCurrentPageCustomerCount = useMemo(
    () =>
      currentPageCustomers.filter((customer) =>
        selectedTaskCustomers.has(customer.id),
      ).length,
    [currentPageCustomers, selectedTaskCustomers],
  );
  const areCurrentPageCustomersSelected =
    canSelectTaskCustomers &&
    currentPageCustomers.length > 0 &&
    selectedCurrentPageCustomerCount === currentPageCustomers.length;
  const areSomeCurrentPageCustomersSelected =
    canSelectTaskCustomers &&
    selectedCurrentPageCustomerCount > 0 &&
    selectedCurrentPageCustomerCount < currentPageCustomers.length;

  useEffect(() => {
    setSelectedTaskCustomers(new Map());
    setIsTaskAssignModalOpen(false);
    setTaskAssignForm(createEmptyTaskAssignForm(todayDateInputValue));
    setTaskAssignErrors({});
    setTaskAssignableUsers([]);
    setIsCreatingTaskAssignment(false);
  }, [appliedBranchName, todayDateInputValue]);

  const handleTableError = useCallback((errorMessage: string) => {
    setMessage(errorMessage);
  }, []);

  const handleLoadMeta = useCallback((meta: CustomersListMeta) => {
    setListMeta(meta);
  }, []);

  const handleFiltersApplied = useCallback(
    (query: Partial<CustomerListQuery>) => {
      setAppliedBranchName(query.branchName?.trim() ?? "");
    },
    [],
  );

  useEffect(() => {
    if (!isTaskAssignModalOpen || !selectedTaskBranchId) {
      setTaskAssignableUsers([]);
      return;
    }

    const branchId = selectedTaskBranchId;
    let isActive = true;

    async function loadTaskAssignableUsers(): Promise<void> {
      setIsTaskAssignableUsersLoading(true);
      setTaskAssignErrors((current) => ({ ...current, assigned_user_id: "" }));

      try {
        const users = await listTaskAssignableUsers(branchId);
        if (isActive) {
          setTaskAssignableUsers(users);
        }
      } catch {
        if (isActive) {
          setTaskAssignableUsers([]);
          setTaskAssignErrors((current) => ({
            ...current,
            assigned_user_id: "Bayi kullanıcıları getirilemedi.",
          }));
        }
      } finally {
        if (isActive) {
          setIsTaskAssignableUsersLoading(false);
        }
      }
    }

    void loadTaskAssignableUsers();

    return () => {
      isActive = false;
    };
  }, [isTaskAssignModalOpen, selectedTaskBranchId]);

  useEffect(() => {
    if (!canListZones) {
      return;
    }

    let isActive = true;

    async function loadZones(): Promise<void> {
      try {
        const nextZones = await listZones();
        if (isActive) {
          setZones(nextZones);
        }
      } catch {
        if (isActive) {
          setMessage("Bölge listesi getirilemedi.");
        }
      }
    }

    void loadZones();

    return () => {
      isActive = false;
    };
  }, [canListZones]);

  useEffect(() => {
    if (!canListBranches) {
      return;
    }

    let isActive = true;

    async function loadBranchFilters(): Promise<void> {
      setIsBranchFilterLoading(true);

      try {
        const nextBranches = await listBranches();
        if (isActive) {
          setBranches(nextBranches);
        }
      } catch {
        if (isActive) {
          setMessage("Bayi listesi getirilemedi.");
        }
      } finally {
        if (isActive) {
          setIsBranchFilterLoading(false);
        }
      }
    }

    void loadBranchFilters();

    return () => {
      isActive = false;
    };
  }, [canListBranches]);

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setMessage("");
    tableRef.current?.applyFilters();
  }

  function handleResetFilters(): void {
    setMessage("");
    tableRef.current?.clearFilters();
    setAppliedBranchName("");
    setCurrentPageCustomers([]);
    setSelectedTaskCustomers(new Map());
    setIsTaskAssignModalOpen(false);
  }

  async function handleOpenCustomerDetail(customerId: number): Promise<void> {
    if (!customerId) {
      setMessage(pageText.detailFailed);
      return;
    }

    setMessage("");

    try {
      const customer = await getCustomer(customerId, "backend");
      setSelectedCustomerDetail(customer);
    } catch {
      setMessage(pageText.detailFailed);
    }
  }

  function handleCloseCustomerDetail(): void {
    setSelectedCustomerDetail(null);
  }

  function handleOpenStandaloneFollowUp(customer: Customer): void {
    setMessage("");
    setStandaloneFollowUpCustomer(customer);
  }

  function handleStandaloneFollowUpCreated(): void {
    setStandaloneFollowUpCustomer(null);
    setMessage("Takip kaydı oluşturuldu.");
  }

  function handleOpenCustomerSearch(): void {
    setIsSearchModalOpen(true);
    setMessage("");
  }

  function handleCloseCustomerSearch(): void {
    setIsSearchModalOpen(false);
  }

  function handleCustomerNotFound(): void {
    setIsCreateModalOpen(true);
  }

  function handleCloseCreateModal(): void {
    setIsCreateModalOpen(false);
  }

  function handleCustomerCreated(): void {
    setMessage(customerEntryTexts.createSuccess);
    tableRef.current?.refresh();
  }

  function handleTaskCustomerToggle(
    customer: Customer,
    checked: boolean,
  ): void {
    if (!canSelectTaskCustomers) {
      return;
    }

    setSelectedTaskCustomers((current) => {
      const next = new Map(current);
      if (checked) {
        next.set(customer.id, customer);
      } else {
        next.delete(customer.id);
      }

      return next;
    });
  }

  function handleToggleCurrentPage(
    checked: boolean,
    pageCustomers: Customer[],
  ): void {
    if (!canSelectTaskCustomers) {
      return;
    }

    if (!checked) {
      setSelectedTaskCustomers(new Map());
      return;
    }

    setSelectedTaskCustomers((current) => {
      const next = new Map(current);
      pageCustomers.forEach((customer) => {
        next.set(customer.id, customer);
      });

      return next;
    });
  }

  function handleOpenTaskAssignModal(): void {
    if (!canSelectTaskCustomers || selectedTaskCustomerCount === 0) {
      return;
    }

    setTaskAssignForm(createEmptyTaskAssignForm(todayDateInputValue));
    setTaskAssignErrors({});
    setMessage("");
    setIsTaskAssignModalOpen(true);
  }

  function handleCloseTaskAssignModal(): void {
    setIsTaskAssignModalOpen(false);
  }

  function updateTaskAssignField(
    field: keyof TaskAssignForm,
    value: string,
  ): void {
    if (field === "priority") {
      if (!isTaskPriority(value)) {
        return;
      }

      setTaskAssignForm((current) => ({
        ...current,
        priority: value,
      }));
      setTaskAssignErrors((current) => ({
        ...current,
        priority: "",
      }));
      return;
    }

    setTaskAssignForm((current) => ({
      ...current,
      [field]: value,
    }));
    setTaskAssignErrors((current) => ({
      ...current,
      [taskAssignFieldToApiField(field)]: "",
    }));
  }

  async function handleTaskAssignSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const validationErrors = validateTaskAssignForm(
      taskAssignForm,
      selectedTaskBranchId,
    );
    if (selectedTaskCustomerCount === 0) {
      validationErrors.customer_ids = "En az 1 müşteri seçilmelidir.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setTaskAssignErrors(validationErrors);
      return;
    }

    if (!selectedTaskBranchId) {
      setTaskAssignErrors({ branch_id: "Bayi filtresi seçilmelidir." });
      return;
    }

    setIsCreatingTaskAssignment(true);
    setTaskAssignErrors({});
    setMessage("");

    try {
      const selectedAssignedUser = taskAssignableUsers.find(
        (user) => user.id === Number(taskAssignForm.assignedUserId),
      );

      await createTaskAssignment({
        title: taskAssignForm.title.trim(),
        description: taskAssignForm.description.trim(),
        assignedUserId: Number(taskAssignForm.assignedUserId),
        assignedUserFullName: selectedAssignedUser?.assignedUserFullName ?? "",
        branchId: selectedTaskBranchId,
        branchName:
          selectedTaskBranch?.name ||
          selectedTaskBranch?.title ||
          appliedBranchName,
        visitDate: taskAssignForm.visitDate,
        dueDate: taskAssignForm.dueDate,
        priority: taskAssignForm.priority,
        customerIds: Array.from(selectedTaskCustomers.keys()),
      });

      setIsTaskAssignModalOpen(false);
      setTaskAssignForm(createEmptyTaskAssignForm(todayDateInputValue));
      setSelectedTaskCustomers(new Map());
      setTaskAssignableUsers([]);
      setMessage("Görev kaydedildi.");
    } catch (error: unknown) {
      if (error instanceof TaskValidationError) {
        setTaskAssignErrors(error.errors);
      } else {
        setMessage("Görev kaydı oluşturulamadı.");
      }
    } finally {
      setIsCreatingTaskAssignment(false);
    }
  }

  if (!canListCustomers) {
    return (
      <div className="card">
        <div className="card-body">
          <ContentHeader title="Galeri Listesi" />
          <p className="mb-0">Bu sayfayı görüntüleme yetkiniz bulunmuyor.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ContentHeader
        title="Galeri Listesi"
        breadcrumbs={[
          { label: "Ana Sayfa", href: "/home" },
          { label: "Galeri Listesi", active: true },
        ]}
      />

      {message ? <div className="alert alert-info">{message}</div> : null}

      {standaloneFollowUpCustomer ? (
        <StandaloneFollowUpModal
          customer={standaloneFollowUpCustomer}
          onClose={() => setStandaloneFollowUpCustomer(null)}
          onCreated={handleStandaloneFollowUpCreated}
        />
      ) : null}

      <CustomerSearchModal
        isOpen={isSearchModalOpen}
        onClose={handleCloseCustomerSearch}
        onNotFound={handleCustomerNotFound}
        onFoundBackend={navigateToFullRegistration}
        onNotify={setMessage}
      />

      <CustomerEntryModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onCreated={handleCustomerCreated}
        onError={setMessage}
        canCreateCustomers={canCreateCustomers}
        canListCities={canListCities}
        canListTowns={canListTowns}
        canListBranches={canListBranches}
      />

      {selectedCustomerDetail ? (
        <ControlledModal
          isOpen
          onClose={handleCloseCustomerDetail}
          title={pageText.detailTitle}
          size="xl"
        >
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
              <strong>{formatCustomerType(selectedCustomerDetail.type)}</strong>
              <span>Kayıt Tarihi</span>
              <strong>{formatDate(selectedCustomerDetail.createdAt)}</strong>
            </div>
        </ControlledModal>
      ) : null}

      {isTaskAssignModalOpen ? (
        <ControlledModal
          isOpen={isTaskAssignModalOpen}
          onClose={handleCloseTaskAssignModal}
          title={pageText.taskAssignTitle}
          size="xl"
          footer={
            <>
              <Button
                theme="secondary"
                size="sm"
                type="button"
                onClick={handleCloseTaskAssignModal}
              >
                Vazgeç
              </Button>
              <Button
                theme="primary"
                size="sm"
                type="submit"
                form={taskAssignFormId}
                disabled={!canCreateTasks || isCreatingTaskAssignment}
              >
                {isCreatingTaskAssignment ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </>
          }
        >
            <div className="task-assign-summary mb-3">
              <span>Seçili müşteri sayısı</span>
              <strong>{selectedTaskCustomerCount}</strong>
              <span>Bayi</span>
              <strong>{appliedBranchName || "-"}</strong>
            </div>

            <form
              id={taskAssignFormId}
              className="task-assign-form"
              onSubmit={handleTaskAssignSubmit}
              noValidate
            >
              <div className="row g-3">
                <CrmFormFieldCol wide>
                  <CrmFormInput
                    formScope="customers-task-assign"
                    field="title"
                    label="Başlık"
                    value={taskAssignForm.title}
                    maxLength={customerTextMaxLength}
                    onChange={(value) => updateTaskAssignField("title", value)}
                    error={taskAssignErrors.title}
                  />
                </CrmFormFieldCol>
                <CrmFormFieldCol wide>
                  <CrmFormInput
                    formScope="customers-task-assign"
                    field="description"
                    label="Açıklama"
                    value={taskAssignForm.description}
                    maxLength={customerTextMaxLength}
                    onChange={(value) => updateTaskAssignField("description", value)}
                    error={taskAssignErrors.description}
                  />
                </CrmFormFieldCol>
                <CrmFormFieldCol>
                  <CrmFormSelect
                    formScope="customers-task-assign"
                    field="assignedUserId"
                    label="Atanacak Kullanıcı"
                    value={taskAssignForm.assignedUserId}
                    disabled={!selectedTaskBranchId || isTaskAssignableUsersLoading}
                    placeholderOption={
                      isTaskAssignableUsersLoading
                        ? "Kullanıcılar yükleniyor..."
                        : "Seçiniz"
                    }
                    options={taskAssignableUsers.map((user) => ({
                      value: String(user.id),
                      label: user.assignedUserFullName,
                    }))}
                    onChange={(value) => updateTaskAssignField("assignedUserId", value)}
                    error={taskAssignErrors.assigned_user_id}
                  />
                </CrmFormFieldCol>
                <CrmFormFieldCol>
                  <CrmFormInput
                    formScope="customers-task-assign"
                    field="visitDate"
                    label="Ziyaret Tarihi"
                    type="date"
                    min={todayDateInputValue}
                    value={taskAssignForm.visitDate}
                    onChange={(value) => updateTaskAssignField("visitDate", value)}
                    error={taskAssignErrors.visit_date}
                  />
                </CrmFormFieldCol>
                <CrmFormFieldCol>
                  <CrmFormInput
                    formScope="customers-task-assign"
                    field="dueDate"
                    label="Bitiş Tarihi"
                    type="date"
                    min={taskAssignForm.visitDate || undefined}
                    value={taskAssignForm.dueDate}
                    onChange={(value) => updateTaskAssignField("dueDate", value)}
                    error={taskAssignErrors.due_date}
                  />
                </CrmFormFieldCol>
                <CrmFormFieldCol>
                  <CrmFormSelect
                    formScope="customers-task-assign"
                    field="priority"
                    label="Öncelik"
                    value={taskAssignForm.priority}
                    hidePlaceholder
                    options={taskPriorityOptions.map((priority) => ({
                      value: priority,
                      label: formatTaskPriority(priority),
                    }))}
                    onChange={(value) => updateTaskAssignField("priority", value)}
                    error={taskAssignErrors.priority}
                  />
                </CrmFormFieldCol>
              </div>

              {taskAssignErrors.branch_id ? (
                <span className="customer-field-error task-assign-form-wide d-block mt-2">
                  {taskAssignErrors.branch_id}
                </span>
              ) : null}
              {taskAssignErrors.customer_ids ? (
                <span className="customer-field-error task-assign-form-wide d-block mt-2">
                  {taskAssignErrors.customer_ids}
                </span>
              ) : null}
            </form>
        </ControlledModal>
      ) : null}

      <div className="card list-table-card mb-3">
        <form className="customer-filter-form" onSubmit={handleFilterSubmit}>
          <ListTableToolbar>
            <button
              className="btn btn-primary btn-sm"
              type="button"
              onClick={handleOpenTaskAssignModal}
              disabled={
                !canSelectTaskCustomers || selectedTaskCustomerCount === 0
              }
            >
              {pageText.taskAssignButton} ({selectedTaskCustomerCount})
            </button>
            <button
              className="btn btn-primary btn-sm"
              type="button"
              onClick={handleOpenCustomerSearch}
              disabled={!canSearchCustomers}
            >
              {customerEntryTexts.button}
            </button>
            <button className="btn btn-primary btn-sm" type="submit">
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
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              disabled={isTableLoading}
              onClick={() => tableRef.current?.downloadCsv("galeri-listesi.csv")}
            >
              {customerListTexts.exportCsv}
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              disabled={isTableLoading}
              onClick={() => tableRef.current?.downloadJson("galeri-listesi.json")}
            >
              {customerListTexts.exportJson}
            </button>
            <span className="text-muted small ms-auto d-none d-md-inline">
              {customerListTexts.exportCurrentPageHint}
            </span>
          </ListTableToolbar>

          <p className="text-muted small d-md-none mb-0 px-3 pt-0 pb-2">
            {customerListTexts.exportCurrentPageHint}
          </p>

          <div className="card-body p-0">
            <CustomersDataTable
              ref={tableRef}
              branches={branches}
              zones={zones}
              canListBranches={canListBranches}
              isBranchFilterLoading={isBranchFilterLoading}
              canListZones={canListZones}
              canSelectTaskCustomers={canSelectTaskCustomers}
              canViewCustomerDetail={canViewCustomerDetail}
              canViewFullRegistration={canViewFullRegistration}
              canCreateStandaloneFollowUp={canCreateStandaloneFollowUp}
              selectedCustomerIds={selectedCustomerIds}
              areCurrentPageCustomersSelected={areCurrentPageCustomersSelected}
              areSomeCurrentPageCustomersSelected={
                areSomeCurrentPageCustomersSelected
              }
              onToggleCustomer={handleTaskCustomerToggle}
              onToggleCurrentPage={handleToggleCurrentPage}
              onOpenCustomerDetail={(customerId) =>
                void handleOpenCustomerDetail(customerId)
              }
              onOpenStandaloneFollowUp={handleOpenStandaloneFollowUp}
              onNavigateFullRegistration={navigateToFullRegistration}
              onFiltersApplied={handleFiltersApplied}
              onPageCustomersChange={setCurrentPageCustomers}
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
    </>
  );
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

function formatTaskPriority(priority: TaskPriority): string {
  const priorityMap: Record<TaskPriority, string> = {
    high: "Yüksek",
    medium: "Orta",
    low: "Düşük",
  };

  return priorityMap[priority];
}

function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isTaskPriority(value: string): value is TaskPriority {
  return taskPriorityOptions.some((priority) => priority === value);
}

function validateTaskAssignForm(
  form: TaskAssignForm,
  branchId: number | null,
): CustomerValidationErrors {
  const errors: CustomerValidationErrors = {};

  requireField(errors, "title", form.title, "Başlık zorunludur.");
  validateMaxLength(errors, "title", form.title, "Başlık");
  validateMaxLength(errors, "description", form.description, "Açıklama");
  requireField(
    errors,
    "assigned_user_id",
    form.assignedUserId,
    "Atanacak kullanıcı zorunludur.",
  );

  if (!branchId) {
    errors.branch_id = "Bayi filtresi seçilmelidir.";
  }

  if (!isTaskPriority(form.priority)) {
    errors.priority = "Öncelik geçersiz.";
  }

  const today = formatDateInputValue(new Date());
  if (form.visitDate && form.visitDate < today) {
    errors.visit_date = "Ziyaret tarihi bugünden önce olamaz.";
  }

  if (form.visitDate && form.dueDate && form.dueDate < form.visitDate) {
    errors.due_date = "Bitiş tarihi ziyaret tarihinden küçük olamaz.";
  }

  return errors;
}

function requireField(
  errors: CustomerValidationErrors,
  field: string,
  value: string,
  message: string,
): void {
  if (!value.trim()) {
    errors[field] = message;
  }
}

function validateMaxLength(
  errors: CustomerValidationErrors,
  field: string,
  value: string,
  label: string,
): void {
  if (value.trim().length > customerTextMaxLength) {
    errors[field] =
      `${label} en fazla ${customerTextMaxLength} karakter olabilir.`;
  }
}

function taskAssignFieldToApiField(field: keyof TaskAssignForm): string {
  const fieldMap: Record<keyof TaskAssignForm, string> = {
    title: "title",
    description: "description",
    assignedUserId: "assigned_user_id",
    visitDate: "visit_date",
    dueDate: "due_date",
    priority: "priority",
  };

  return fieldMap[field];
}

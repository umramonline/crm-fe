import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { CustomerEntryModal } from "@/features/customers/components/CustomerEntryModal";
import { CustomerSearchModal } from "@/features/customers/components/CustomerSearchModal";
import { customerEntryTexts, customerTextMaxLength } from "@/features/customers/constants/customerEntryTexts";
import {
  getCustomer,
  listBranches,
  listCustomers,
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
import { navigateToFullRegistration } from "@/shared/utils/navigation";
import { StandaloneFollowUpModal } from "@/features/followUps/components/StandaloneFollowUpModal";

const situationOptions = [
  "Potansiyel Müşteri",
  "Kayıp Müşteri",
  "Pasif Müşteri",
  "Yarı Aktif Müşteri",
  "Aktif Müşteri",
] as const;

const typeOptions = ["Kurumsal", "Bireysel"] as const;
const taskPriorityOptions = ["high", "medium", "low"] as const;

const pageText = {
  detailFailed: "Müşteri detayı getirilemedi.",
  detailTitle: "Müşteri Detayı",
  taskAssignButton: "Görev Ata",
  taskAssignTitle: "Görev Ata",
} as const;

type CustomerFilters = {
  situation: string;
  unvan: string;
  cep: string;
  ad: string;
  soyad: string;
  branchName: string;
  zoneName: string;
  plusCardNo: string;
  city: string;
  town: string;
  createdAt: string;
  type: string;
};

type SortableColumn = NonNullable<CustomerListQuery["sortBy"]>;

type TaskPriority = (typeof taskPriorityOptions)[number];

type TaskAssignForm = {
  title: string;
  description: string;
  assignedUserId: string;
  visitDate: string;
  dueDate: string;
  priority: TaskPriority;
};

const emptyFilters: CustomerFilters = {
  situation: "",
  unvan: "",
  cep: "",
  ad: "",
  soyad: "",
  branchName: "",
  zoneName: "",
  plusCardNo: "",
  city: "",
  town: "",
  createdAt: "",
  type: "",
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

  const [zones, setZones] = useState<Zone[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [draftFilters, setDraftFilters] =
    useState<CustomerFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<CustomerFilters>(emptyFilters);
  const [items, setItems] = useState<Customer[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<CustomerListQuery["sortBy"]>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = useState(false);
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
  const taskSelectionHeaderRef = useRef<HTMLInputElement>(null);
  const todayDateInputValue = useMemo(
    () => formatDateInputValue(new Date()),
    [],
  );
  const hasAppliedBranchFilter = appliedFilters.branchName.trim() !== "";
  const selectedTaskBranch = useMemo(
    () =>
      branches.find((branch) => {
        const branchName = branch.name || branch.title;
        return branchName === appliedFilters.branchName;
      }) ?? null,
    [appliedFilters.branchName, branches],
  );
  const selectedTaskBranchId = selectedTaskBranch?.id ?? null;
  const canSelectTaskCustomers =
    hasAppliedBranchFilter && selectedTaskBranchId !== null;
  const selectedTaskCustomerCount = selectedTaskCustomers.size;
  const selectedCurrentPageCustomerCount = useMemo(
    () =>
      items.filter((customer) => selectedTaskCustomers.has(customer.id)).length,
    [items, selectedTaskCustomers],
  );
  const areCurrentPageCustomersSelected =
    canSelectTaskCustomers &&
    items.length > 0 &&
    selectedCurrentPageCustomerCount === items.length;
  const areSomeCurrentPageCustomersSelected =
    canSelectTaskCustomers &&
    selectedCurrentPageCustomerCount > 0 &&
    selectedCurrentPageCustomerCount < items.length;

  useEffect(() => {
    setSelectedTaskCustomers(new Map());
    setIsTaskAssignModalOpen(false);
    setTaskAssignForm(createEmptyTaskAssignForm(todayDateInputValue));
    setTaskAssignErrors({});
    setTaskAssignableUsers([]);
    setIsCreatingTaskAssignment(false);
  }, [appliedFilters.branchName, todayDateInputValue]);

  useEffect(() => {
    if (!taskSelectionHeaderRef.current) {
      return;
    }

    taskSelectionHeaderRef.current.indeterminate =
      areSomeCurrentPageCustomersSelected;
  }, [areSomeCurrentPageCustomersSelected]);

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
          perPage: 20,
          situation: appliedFilters.situation,
          unvan: appliedFilters.unvan,
          cep: appliedFilters.cep,
          ad: appliedFilters.ad,
          soyad: appliedFilters.soyad,
          branchName: appliedFilters.branchName,
          zoneName: appliedFilters.zoneName,
          plusCardNo: appliedFilters.plusCardNo,
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
    setCurrentPage(1);
    setAppliedFilters((current) => ({ ...current }));
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

  function handleCurrentPageTaskCustomerToggle(checked: boolean): void {
    if (!canSelectTaskCustomers) {
      return;
    }

    if (!checked) {
      setSelectedTaskCustomers(new Map());
      return;
    }

    setSelectedTaskCustomers((current) => {
      const next = new Map(current);
      items.forEach((customer) => {
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
          appliedFilters.branchName,
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

  function handleSort(column: SortableColumn): void {
    if (!column) {
      return;
    }

    if (sortBy === column) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(column);
    setSortOrder("desc");
    setCurrentPage(1);
  }

  function sortIndicator(column: SortableColumn): string {
    if (sortBy !== column) {
      return "";
    }

    return sortOrder === "asc" ? " ↑" : " ↓";
  }

  if (!canListCustomers) {
    return (
      <section className="panel-card">
        <div className="page-title">
          <h1>Galeri Listesi</h1>
          <p>Bu sayfayı görüntüleme yetkiniz bulunmuyor.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel-card permission-table-panel">
      <div className="page-title">
        <h1>Galeri Listesi</h1>
        <p>
          Müşteri listesini filtreleyebilir, sıralayabilir ve
          sayfalayabilirsiniz.
        </p>
      </div>

      {message ? <div className="panel-alert">{message}</div> : null}

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
        <div className="customer-modal-backdrop" role="presentation">
          <section
            className="customer-modal customer-modal-wide"
            role="dialog"
            aria-modal="true"
          >
            <div className="customer-modal-header">
              <h2>{pageText.detailTitle}</h2>
              <button
                className="customer-modal-close"
                type="button"
                onClick={handleCloseCustomerDetail}
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
              <strong>{formatCustomerType(selectedCustomerDetail.type)}</strong>
              <span>Kayıt Tarihi</span>
              <strong>{formatDate(selectedCustomerDetail.createdAt)}</strong>
            </div>
          </section>
        </div>
      ) : null}

      {isTaskAssignModalOpen ? (
        <div className="customer-modal-backdrop" role="presentation">
          <section
            className="customer-modal customer-modal-wide"
            role="dialog"
            aria-modal="true"
          >
            <div className="customer-modal-header">
              <h2>{pageText.taskAssignTitle}</h2>
              <button
                className="customer-modal-close"
                type="button"
                onClick={handleCloseTaskAssignModal}
              >
                Kapat
              </button>
            </div>

            <div className="task-assign-summary">
              <span>Seçili müşteri sayısı</span>
              <strong>{selectedTaskCustomerCount}</strong>
              <span>Bayi</span>
              <strong>{appliedFilters.branchName || "-"}</strong>
            </div>

            <form
              className="task-assign-form"
              onSubmit={handleTaskAssignSubmit}
            >
              <label className="field-label">
                Başlık
                <input
                  className="panel-input"
                  maxLength={customerTextMaxLength}
                  value={taskAssignForm.title}
                  onChange={(event) =>
                    updateTaskAssignField("title", event.target.value)
                  }
                />
                {taskAssignErrors.title ? (
                  <span className="customer-field-error">
                    {taskAssignErrors.title}
                  </span>
                ) : null}
              </label>

              <label className="field-label">
                Açıklama
                <input
                  className="panel-input"
                  maxLength={customerTextMaxLength}
                  value={taskAssignForm.description}
                  onChange={(event) =>
                    updateTaskAssignField("description", event.target.value)
                  }
                />
                {taskAssignErrors.description ? (
                  <span className="customer-field-error">
                    {taskAssignErrors.description}
                  </span>
                ) : null}
              </label>

              <label className="field-label">
                Atanacak Kullanıcı
                <select
                  className="panel-input"
                  value={taskAssignForm.assignedUserId}
                  onChange={(event) =>
                    updateTaskAssignField("assignedUserId", event.target.value)
                  }
                  disabled={
                    !selectedTaskBranchId || isTaskAssignableUsersLoading
                  }
                >
                  <option value="">
                    {isTaskAssignableUsersLoading
                      ? "Kullanıcılar yükleniyor..."
                      : "Seçiniz"}
                  </option>
                  {taskAssignableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.assignedUserFullName}
                    </option>
                  ))}
                </select>
                {taskAssignErrors.assigned_user_id ? (
                  <span className="customer-field-error">
                    {taskAssignErrors.assigned_user_id}
                  </span>
                ) : null}
              </label>

              <label className="field-label">
                Ziyaret Tarihi
                <input
                  className="panel-input"
                  type="date"
                  min={todayDateInputValue}
                  value={taskAssignForm.visitDate}
                  onChange={(event) =>
                    updateTaskAssignField("visitDate", event.target.value)
                  }
                />
                {taskAssignErrors.visit_date ? (
                  <span className="customer-field-error">
                    {taskAssignErrors.visit_date}
                  </span>
                ) : null}
              </label>

              <label className="field-label">
                Bitiş Tarihi
                <input
                  className="panel-input"
                  type="date"
                  min={taskAssignForm.visitDate || undefined}
                  value={taskAssignForm.dueDate}
                  onChange={(event) =>
                    updateTaskAssignField("dueDate", event.target.value)
                  }
                />
                {taskAssignErrors.due_date ? (
                  <span className="customer-field-error">
                    {taskAssignErrors.due_date}
                  </span>
                ) : null}
              </label>

              <label className="field-label">
                Öncelik
                <select
                  className="panel-input"
                  value={taskAssignForm.priority}
                  onChange={(event) =>
                    updateTaskAssignField("priority", event.target.value)
                  }
                >
                  {taskPriorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {formatTaskPriority(priority)}
                    </option>
                  ))}
                </select>
                {taskAssignErrors.priority ? (
                  <span className="customer-field-error">
                    {taskAssignErrors.priority}
                  </span>
                ) : null}
              </label>

              {taskAssignErrors.branch_id ? (
                <span className="customer-field-error task-assign-form-wide">
                  {taskAssignErrors.branch_id}
                </span>
              ) : null}
              {taskAssignErrors.customer_ids ? (
                <span className="customer-field-error task-assign-form-wide">
                  {taskAssignErrors.customer_ids}
                </span>
              ) : null}

              <div className="customer-modal-actions task-assign-form-wide">
                <button
                  className="gray-button"
                  type="button"
                  onClick={handleCloseTaskAssignModal}
                >
                  Vazgeç
                </button>
                <button
                  className="blue-button"
                  type="submit"
                  disabled={!canCreateTasks || isCreatingTaskAssignment}
                >
                  {isCreatingTaskAssignment ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      <form className="customer-filter-form" onSubmit={handleFilterSubmit}>
        <div className="customer-filter-actions">
          <button
            className="blue-button"
            type="button"
            onClick={handleOpenTaskAssignModal}
            disabled={
              !canSelectTaskCustomers || selectedTaskCustomerCount === 0
            }
          >
            {pageText.taskAssignButton} ({selectedTaskCustomerCount})
          </button>
          <button
            className="blue-button"
            type="button"
            onClick={handleOpenCustomerSearch}
            disabled={!canSearchCustomers}
          >
            {customerEntryTexts.button}
          </button>
          <button className="blue-button" type="submit">
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

      <div className="permission-table-scroll">
        <table className="permission-table customer-table">
          <thead>
            <tr>
              <th className="customer-selection-cell">
                <input
                  ref={taskSelectionHeaderRef}
                  type="checkbox"
                  aria-label="Listelenen müşterileri seç"
                  checked={areCurrentPageCustomersSelected}
                  disabled={!canSelectTaskCustomers || items.length === 0}
                  onChange={(event) =>
                    handleCurrentPageTaskCustomerToggle(event.target.checked)
                  }
                />
              </th>
              <th>İşlemler</th>
              <th>Durum</th>
              <th>Firma İsmi</th>
              <th>Yetkili Telefonu</th>
              <th>Yetkili İsmi</th>
              <th>Yetkili Soyismi</th>
              <th>
                <button
                  className="table-sort-button"
                  type="button"
                  onClick={() => handleSort("vehicle_stock_count")}
                >
                  Araç Stok Adedi
                  {sortIndicator("vehicle_stock_count")}
                </button>
              </th>
              <th>Bayi</th>
              <th>Bölge</th>
              <th>Plus Card No</th>
              <th>
                <button
                  className="table-sort-button"
                  type="button"
                  onClick={() => handleSort("credit")}
                >
                  Kredi Bakiyesi
                  {sortIndicator("credit")}
                </button>
              </th>
              <th>
                <button
                  className="table-sort-button"
                  type="button"
                  onClick={() => handleSort("point")}
                >
                  Puan Bakiyesi
                  {sortIndicator("point")}
                </button>
              </th>
              <th>İl</th>
              <th>İlçe</th>
              <th>
                <button
                  className="table-sort-button"
                  type="button"
                  onClick={() => handleSort("created_at")}
                >
                  Kayıt Tarihi
                  {sortIndicator("created_at")}
                </button>
              </th>
              <th>Müşteri Türü</th>
            </tr>
            <tr className="customer-filter-row">
              <th />
              <th />
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
              <th />
              <th>
                <select
                  className="panel-input"
                  value={draftFilters.branchName}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      branchName: event.target.value,
                    }))
                  }
                  disabled={!canListBranches || isBranchFilterLoading}
                >
                  <option value="">Tümü</option>
                  {branches.map((branch) => {
                    const branchName = branch.name || branch.title;

                    return (
                      <option key={branch.id} value={branchName}>
                        {branchName}
                      </option>
                    );
                  })}
                </select>
              </th>
              <th>
                <select
                  className="panel-input"
                  value={draftFilters.zoneName}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      zoneName: event.target.value,
                    }))
                  }
                  disabled={!canListZones}
                >
                  <option value="">Tümü</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.name}>
                      {zone.name}
                    </option>
                  ))}
                </select>
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
              <th />
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
                <td colSpan={17}>Kayıt bulunamadı.</td>
              </tr>
            ) : null}

            {items.map((customer, index) => (
              <tr
                key={`${customer.id}-${customer.uoId}-${customer.plusCardNo}-${customer.cep}-${index}`}
              >
                <td className="customer-selection-cell">
                  <input
                    type="checkbox"
                    aria-label={`${customerDisplayNameFromList(customer)} müşterisini seç`}
                    checked={selectedTaskCustomers.has(customer.id)}
                    disabled={!canSelectTaskCustomers || !customer.id}
                    onChange={(event) =>
                      handleTaskCustomerToggle(customer, event.target.checked)
                    }
                  />
                </td>
                <td>
                  <div className="customer-action-group">
                    <button
                      className="customer-action-button"
                      type="button"
                      aria-label="Müşteri detayını görüntüle"
                      disabled={!canViewCustomerDetail || !customer.id}
                      onClick={() => void handleOpenCustomerDetail(customer.id)}
                    >
                      ⓘ
                    </button>
                    {canViewFullRegistration && customer.id ? (
                      <button
                        className="customer-action-button"
                        type="button"
                        aria-label="Müşteri tam kaydını düzenle"
                        onClick={() => navigateToFullRegistration(customer.id)}
                      >
                        ✎
                      </button>
                    ) : null}
                    {canCreateStandaloneFollowUp && customer.id ? (
                      <button
                        className="customer-action-button task-follow-button"
                        type="button"
                        aria-label="Takip kaydı oluştur"
                        onClick={() => handleOpenStandaloneFollowUp(customer)}
                      >
                        📓
                      </button>
                    ) : null}
                  </div>
                </td>
                <td>{customer.situation || "-"}</td>
                <td>{customer.unvan || "-"}</td>
                <td>{customer.cep || "-"}</td>
                <td>{customer.ad || "-"}</td>
                <td>{customer.soyad || "-"}</td>
                <td>{formatVehicleStockCount(customer.vehicleStockCount)}</td>
                <td>{customer.branchName || "-"}</td>
                <td>{customer.zoneName || "-"}</td>
                <td>{customer.plusCardNo || "-"}</td>
                <td>{formatCredit(customer.credit)}</td>
                <td>{formatCredit(customer.point)}</td>
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

function formatVehicleStockCount(value: number | null): string {
  if (value === null) {
    return "-";
  }

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

function customerDisplayNameFromList(customer: Customer): string {
  const corporateName = customer.unvan.trim();
  if (corporateName) {
    return corporateName;
  }

  const individualName = `${customer.ad} ${customer.soyad}`.trim();
  return individualName || "-";
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

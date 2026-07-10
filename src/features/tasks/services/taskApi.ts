import { apiClient } from "@/services/apiClient";

export type TaskValidationErrors = Record<string, string>;

export type TaskPriority = "high" | "medium" | "low";
export type TaskStatus = "pending" | "in_progress" | "cancelled" | "completed";
export type FollowUpVisitType = "Yerinde Ziyaret";
export type FollowUpAgreementFailureReason =
  | "Fiyat yüksek"
  | "Mesafe Uzak"
  | "Bayi ile yaşanan sorunlar"
  | "Ekpertize ihtiyaç duymuyor"
  | "Kendisi yapıyor"
  | "Başka ekspertize yaptırıyor"
  | "Değerlendirme";
export type FollowUpMeetPersonTitle =
  | "Genel Müdür"
  | "Satış Müdürü"
  | "Operasyon Müdürü"
  | "Pazarlama Müdürü"
  | "İşletme Müdürü"
  | "Bölge Müdürü"
  | "Şube Müdürü"
  | "Yönetici"
  | "Sahibi"
  | "Ortağı";

export type TaskAssignableUser = {
  id: number;
  name: string;
  assignedUserFullName: string;
  phone: string;
};

export type CreateTaskAssignmentPayload = {
  title: string;
  description: string;
  assignedUserId: number;
  assignedUserFullName: string;
  branchId: number;
  branchName: string;
  visitDate: string;
  dueDate: string;
  priority: TaskPriority;
  customerIds: number[];
};

export type CreateFollowUpPayload = {
  tasksCustomerUuid: string;
  visitDate: string;
  nextVisitDate: string;
  visitType: FollowUpVisitType;
  agreementReached: boolean;
  agreementFailureReason: FollowUpAgreementFailureReason | "";
  note: string;
  meetPeople: {
    title: FollowUpMeetPersonTitle | "";
    name: string;
    surname: string;
    phone: string;
    email: string;
  }[];
  images: File[];
};

export type TaskCustomer = {
  uuid: string;
  uoId: string;
  vehicleStockCount: number | null;
  customerId: number;
  unvan: string;
  ad: string;
  soyad: string;
  eposta: string;
  status: TaskStatus;
};

export type TaskListItem = {
  uuid: string;
  title: string;
  description: string;
  assignedUserId: number;
  createdByUserFullName: string;
  assignedUserFullName: string;
  branchName: string;
  visitDate: string;
  dueDate: string;
  priority: TaskPriority;
  customerCount: number;
  customers: TaskCustomer[];
};

export type TaskPagination = {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  from: number | null;
  to: number | null;
};

export type TaskListResult = {
  items: TaskListItem[];
  pagination: TaskPagination;
};

export type TaskListQuery = {
  page?: number;
  perPage?: number;
  title?: string;
  customer?: string;
  assignedUserFullName?: string;
  branchName?: string;
  visitDate?: string;
  dueDate?: string;
  priority?: TaskPriority | "";
  createdByUserFullName?: string;
  sortBy?: "visit_date" | "due_date" | "";
  sortOrder?: "asc" | "desc";
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: TaskValidationErrors;
};

type RawRecord = Record<string, unknown>;

export class TaskValidationError extends Error {
  errors: TaskValidationErrors;

  constructor(errors: TaskValidationErrors) {
    super("Görev bilgileri geçersiz.");
    this.errors = errors;
  }
}

export class FollowUpValidationError extends Error {
  errors: TaskValidationErrors;

  constructor(errors: TaskValidationErrors) {
    super("Takip kaydı bilgileri geçersiz.");
    this.errors = errors;
  }
}

export async function listTaskAssignableUsers(
  branchId: number,
): Promise<TaskAssignableUser[]> {
  const response = await apiClient.get<ApiEnvelope<RawRecord>>(
    `/api/v1/branches/${branchId}/users`,
  );
  const items = (response.data.data?.items as RawRecord[] | undefined) ?? [];

  return items.map((item) => ({
    id: numberValue(item.assigned_user_id ?? item.id),
    name: stringValue(item.name),
    assignedUserFullName: stringValue(
      item.assigned_user_full_name ?? item.name,
    ),
    phone: stringValue(item.phone),
  }));
}

export async function listTasks(
  query: TaskListQuery = {},
): Promise<TaskListResult> {
  const response = await apiClient.get<ApiEnvelope<RawRecord>>(
    "/api/v1/tasks",
    {
      params: taskListQueryParams(query),
    },
  );

  return normalizeTaskListResult(response.data.data ?? {});
}

export async function listAssignedTasks(
  query: TaskListQuery = {},
): Promise<TaskListResult> {
  const response = await apiClient.get<ApiEnvelope<RawRecord>>(
    "/api/v1/tasks/assigned-to-me",
    {
      params: taskListQueryParams(query),
    },
  );

  return normalizeTaskListResult(response.data.data ?? {});
}

export async function getTaskDetail(
  uuid: string,
  tasksCustomerUuid?: string,
): Promise<TaskListItem> {
  const response = await apiClient.get<ApiEnvelope<RawRecord>>(
    `/api/v1/tasks/${uuid}`,
    {
      params: {
        tasks_customer_uuid: tasksCustomerUuid || undefined,
      },
    },
  );

  return toTaskListItem(response.data.data ?? {});
}

export async function cancelTask(
  uuid: string,
  tasksCustomerUuid: string,
): Promise<TaskListItem> {
  const response = await apiClient.patch<ApiEnvelope<RawRecord>>(
    `/api/v1/tasks/${uuid}/cancel`,
    null,
    {
      params: {
        tasks_customer_uuid: tasksCustomerUuid,
      },
    },
  );

  return toTaskListItem(response.data.data ?? {});
}

export async function createTaskAssignment(
  payload: CreateTaskAssignmentPayload,
): Promise<void> {
  try {
    await apiClient.post<ApiEnvelope<RawRecord>>("/api/v1/tasks", {
      title: payload.title,
      description: payload.description,
      assigned_user_id: payload.assignedUserId,
      assigned_user_full_name: payload.assignedUserFullName,
      branch_id: payload.branchId,
      branch_name: payload.branchName,
      visit_date: payload.visitDate,
      due_date: payload.dueDate,
      priority: payload.priority,
      customer_ids: payload.customerIds,
    });
  } catch (error: unknown) {
    const apiError = error as {
      response?: {
        status?: number;
        data?: ApiEnvelope<RawRecord>;
      };
    };

    if (apiError.response?.status === 422) {
      throw new TaskValidationError(apiError.response.data?.errors ?? {});
    }

    throw error;
  }
}

export async function createFollowUp(
  payload: CreateFollowUpPayload,
): Promise<void> {
  const formData = new FormData();
  formData.append("tasks_customer_uuid", payload.tasksCustomerUuid);
  formData.append("visit_date", payload.visitDate);
  if (payload.nextVisitDate) {
    formData.append("next_visit_date", payload.nextVisitDate);
  }
  formData.append("visit_type", payload.visitType);
  formData.append("agreement_reached", String(payload.agreementReached));

  if (!payload.agreementReached && payload.agreementFailureReason) {
    formData.append("agreement_failure_reason", payload.agreementFailureReason);
  }

  if (payload.note.trim()) {
    formData.append("note", payload.note.trim());
  }

  formData.append(
    "meet_people",
    JSON.stringify(
      payload.meetPeople.map((person) => ({
        title: person.title,
        name: person.name,
        surname: person.surname,
        phone: person.phone,
        email: person.email,
      })),
    ),
  );

  payload.images.forEach((image) => {
    formData.append("images", image);
  });

  try {
    await apiClient.post<ApiEnvelope<RawRecord>>(
      "/api/v1/follow-ups",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
  } catch (error: unknown) {
    const apiError = error as {
      response?: {
        status?: number;
        data?: ApiEnvelope<RawRecord>;
      };
    };

    if (apiError.response?.status === 422) {
      throw new FollowUpValidationError(apiError.response.data?.errors ?? {});
    }

    throw error;
  }
}

function taskListQueryParams(query: TaskListQuery): RawRecord {
  return {
    page: query.page,
    per_page: query.perPage,
    title: query.title || undefined,
    customer: query.customer || undefined,
    assigned_user_full_name: query.assignedUserFullName || undefined,
    branch_name: query.branchName || undefined,
    visit_date: query.visitDate || undefined,
    due_date: query.dueDate || undefined,
    priority: query.priority || undefined,
    created_by_user_full_name: query.createdByUserFullName || undefined,
    sort_by: query.sortBy || undefined,
    sort_order: query.sortOrder || undefined,
  };
}

function numberValue(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }

  return 0;
}

function nullableNumberValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return numberValue(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function normalizeTaskListResult(data: RawRecord): TaskListResult {
  const pagination = (data.pagination as RawRecord | undefined) ?? {};

  return {
    items: Array.isArray(data.items)
      ? data.items.map((item) => toTaskListItem(item as RawRecord))
      : [],
    pagination: {
      currentPage: numberValue(pagination.current_page),
      lastPage: numberValue(pagination.last_page),
      perPage: numberValue(pagination.per_page),
      total: numberValue(pagination.total),
      from: nullableNumberValue(pagination.from),
      to: nullableNumberValue(pagination.to),
    },
  };
}

function toTaskListItem(record: RawRecord): TaskListItem {
  return {
    uuid: stringValue(record.uuid),
    title: stringValue(record.title) || "Potansiyel Müşteri",
    description: stringValue(record.description),
    assignedUserId: numberValue(record.assigned_user_id),
    createdByUserFullName: stringValue(record.created_by_user_full_name),
    assignedUserFullName: stringValue(record.assigned_user_full_name),
    branchName: stringValue(record.branch_name),
    visitDate: stringValue(record.visit_date),
    dueDate: stringValue(record.due_date),
    priority: taskPriorityValue(record.priority),
    customerCount: numberValue(record.customer_count),
    customers: Array.isArray(record.customers)
      ? record.customers.map((customer) =>
          toTaskCustomer(customer as RawRecord),
        )
      : [],
  };
}

function toTaskCustomer(record: RawRecord): TaskCustomer {
  return {
    uuid: stringValue(record.uuid),
    uoId: stringValue(record.uo_id),
    vehicleStockCount: nullableNumberValue(record.vehicle_stock_count),
    customerId: numberValue(record.customer_id),
    unvan: stringValue(record.unvan),
    ad: stringValue(record.ad),
    soyad: stringValue(record.soyad),
    eposta: stringValue(record.eposta),
    status: taskStatusValue(record.status),
  };
}

function taskPriorityValue(value: unknown): TaskPriority {
  return value === "high" || value === "low" ? value : "medium";
}

function taskStatusValue(value: unknown): TaskStatus {
  if (
    value === "pending" ||
    value === "in_progress" ||
    value === "cancelled" ||
    value === "completed"
  ) {
    return value;
  }

  return "pending";
}

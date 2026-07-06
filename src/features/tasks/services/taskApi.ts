import { apiClient } from "@/services/apiClient";

export type TaskValidationErrors = Record<string, string>;

export type TaskPriority = "high" | "medium" | "low";
export type TaskStatus = "pending" | "in_progress" | "cancelled" | "completed";

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

export type TaskCustomer = {
  id: number;
  unvan: string;
  ad: string;
  soyad: string;
};

export type TaskListItem = {
  uuid: string;
  title: string;
  description: string;
  createdByUserFullName: string;
  assignedUserFullName: string;
  branchName: string;
  visitDate: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
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
  status?: TaskStatus | "";
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

export async function listTaskAssignableUsers(branchId: number): Promise<TaskAssignableUser[]> {
  const response = await apiClient.get<ApiEnvelope<RawRecord>>(`/api/v1/branches/${branchId}/users`);
  const items = (response.data.data?.items as RawRecord[] | undefined) ?? [];

  return items.map((item) => ({
    id: numberValue(item.assigned_user_id ?? item.id),
    name: stringValue(item.name),
    assignedUserFullName: stringValue(item.assigned_user_full_name ?? item.name),
    phone: stringValue(item.phone),
  }));
}

export async function listTasks(query: TaskListQuery = {}): Promise<TaskListResult> {
  const response = await apiClient.get<ApiEnvelope<RawRecord>>("/api/v1/tasks", {
    params: {
      page: query.page,
      per_page: query.perPage,
      title: query.title || undefined,
      customer: query.customer || undefined,
      assigned_user_full_name: query.assignedUserFullName || undefined,
      branch_name: query.branchName || undefined,
      visit_date: query.visitDate || undefined,
      due_date: query.dueDate || undefined,
      priority: query.priority || undefined,
      status: query.status || undefined,
      created_by_user_full_name: query.createdByUserFullName || undefined,
      sort_by: query.sortBy || undefined,
      sort_order: query.sortOrder || undefined,
    },
  });

  return normalizeTaskListResult(response.data.data ?? {});
}

export async function getTaskDetail(uuid: string): Promise<TaskListItem> {
  const response = await apiClient.get<ApiEnvelope<RawRecord>>(`/api/v1/tasks/${uuid}`);

  return toTaskListItem(response.data.data ?? {});
}

export async function cancelTask(uuid: string): Promise<TaskListItem> {
  const response = await apiClient.patch<ApiEnvelope<RawRecord>>(
    `/api/v1/tasks/${uuid}/cancel`,
  );

  return toTaskListItem(response.data.data ?? {});
}

export async function createTaskAssignment(payload: CreateTaskAssignmentPayload): Promise<void> {
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
    createdByUserFullName: stringValue(record.created_by_user_full_name),
    assignedUserFullName: stringValue(record.assigned_user_full_name),
    branchName: stringValue(record.branch_name),
    visitDate: stringValue(record.visit_date),
    dueDate: stringValue(record.due_date),
    priority: taskPriorityValue(record.priority),
    status: taskStatusValue(record.status),
    customers: Array.isArray(record.customers)
      ? record.customers.map((customer) => toTaskCustomer(customer as RawRecord))
      : [],
  };
}

function toTaskCustomer(record: RawRecord): TaskCustomer {
  return {
    id: numberValue(record.id),
    unvan: stringValue(record.unvan),
    ad: stringValue(record.ad),
    soyad: stringValue(record.soyad),
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

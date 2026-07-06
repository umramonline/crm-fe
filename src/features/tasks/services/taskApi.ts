import { apiClient } from "@/services/apiClient";

export type TaskValidationErrors = Record<string, string>;

export type TaskPriority = "high" | "medium" | "low";

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

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

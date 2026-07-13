import { apiClient } from "@/services/apiClient";

export type FollowUpListItem = {
  uuid: string;
  tasksCustomerUuid: string;
  taskUuid: string;
  title: string;
  customerId: number;
  customerUnvan: string;
  assignedUserFullName: string;
  branchName: string;
  visitDate: string;
  nextVisitDate: string;
  agreementReached: boolean;
};

export type FollowUpDetail = FollowUpListItem & {
  visitType: string;
  agreementFailureReason: string;
  note: string;
  images: FollowUpImage[];
  meetPeople: FollowUpMeetPerson[];
};

export type FollowUpImage = {
  uuid: string;
  url: string;
};

export type FollowUpMeetPerson = {
  uuid: string;
  title: string;
  name: string;
  surname: string;
  phone: string;
  email: string;
};

export type FollowUpUpdateMeetPerson = {
  title: string;
  name: string;
  surname: string;
  phone: string;
  email: string;
};

export type FollowUpUpdateInput = {
  visitType: string;
  nextVisitDate: string;
  agreementReached: boolean;
  agreementFailureReason: string;
  note: string;
  existingImageUuids: string[];
  images: File[];
  meetPeople: FollowUpUpdateMeetPerson[];
};

export type FollowUpPagination = {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  from: number | null;
  to: number | null;
};

export type FollowUpListResult = {
  items: FollowUpListItem[];
  pagination: FollowUpPagination;
};

export type FollowUpListQuery = {
  page?: number;
  perPage?: number;
  title?: string;
  customer?: string;
  assignedUserFullName?: string;
  branchName?: string;
  visitDate?: string;
  nextVisitDate?: string;
  sortBy?: "visit_date" | "next_visit_date" | "agreement_reached" | "";
  sortOrder?: "asc" | "desc";
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data?: T;
};

type RawRecord = Record<string, unknown>;

export async function listFollowUps(
  query: FollowUpListQuery = {},
): Promise<FollowUpListResult> {
  return requestFollowUps("/api/v1/follow-ups", query);
}

export async function listAssignedFollowUps(
  query: FollowUpListQuery = {},
): Promise<FollowUpListResult> {
  return requestFollowUps("/api/v1/follow-ups/assigned-to-me", query);
}

async function requestFollowUps(
  path: string,
  query: FollowUpListQuery,
): Promise<FollowUpListResult> {
  const response = await apiClient.get<ApiEnvelope<RawRecord>>(
    path,
    {
      params: {
        page: query.page,
        per_page: query.perPage,
        title: query.title || undefined,
        customer: query.customer || undefined,
        assigned_user_full_name: query.assignedUserFullName || undefined,
        branch_name: query.branchName || undefined,
        visit_date: query.visitDate || undefined,
        next_visit_date: query.nextVisitDate || undefined,
        sort_by: query.sortBy || undefined,
        sort_order: query.sortOrder || undefined,
      },
    },
  );

  return normalizeFollowUpListResult(response.data.data ?? {});
}

export async function getFollowUp(uuid: string): Promise<FollowUpDetail> {
  const response = await apiClient.get<ApiEnvelope<RawRecord>>(
    `/api/v1/follow-ups/${uuid}`,
  );

  return toFollowUpDetail(response.data.data ?? {});
}

export async function updateFollowUp(
  uuid: string,
  input: FollowUpUpdateInput,
): Promise<FollowUpDetail> {
  const formData = new FormData();
  formData.append("visit_type", input.visitType);
  formData.append("next_visit_date", input.nextVisitDate);
  formData.append("agreement_reached", String(input.agreementReached));
  formData.append("agreement_failure_reason", input.agreementFailureReason);
  formData.append("note", input.note);
  formData.append("existing_image_uuids", JSON.stringify(input.existingImageUuids));
  formData.append("meet_people", JSON.stringify(input.meetPeople));
  input.images.forEach((image) => {
    formData.append("images", image);
  });

  const response = await apiClient.put<ApiEnvelope<RawRecord>>(
    `/api/v1/follow-ups/${uuid}`,
    formData,
  );

  return toFollowUpDetail(response.data.data ?? {});
}

function normalizeFollowUpListResult(data: RawRecord): FollowUpListResult {
  const pagination = (data.pagination as RawRecord | undefined) ?? {};

  return {
    items: Array.isArray(data.items)
      ? data.items.map((item) => toFollowUpListItem(item as RawRecord))
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

function toFollowUpDetail(record: RawRecord): FollowUpDetail {
  return {
    ...toFollowUpListItem(record),
    visitType: stringValue(record.visit_type),
    agreementFailureReason: stringValue(record.agreement_failure_reason),
    note: stringValue(record.note),
    images: Array.isArray(record.images)
      ? record.images.map((image) => toFollowUpImage(image as RawRecord))
      : [],
    meetPeople: Array.isArray(record.meet_people)
      ? record.meet_people.map((person) =>
          toFollowUpMeetPerson(person as RawRecord),
        )
      : [],
  };
}

function toFollowUpListItem(record: RawRecord): FollowUpListItem {
  return {
    uuid: stringValue(record.uuid),
    tasksCustomerUuid: stringValue(record.tasks_customer_uuid),
    taskUuid: stringValue(record.task_uuid),
    title: stringValue(record.title),
    customerId: numberValue(record.customer_id),
    customerUnvan: stringValue(record.customer_unvan),
    assignedUserFullName: stringValue(record.assigned_user_full_name),
    branchName: stringValue(record.branch_name),
    visitDate: stringValue(record.visit_date),
    nextVisitDate: stringValue(record.next_visit_date),
    agreementReached: Boolean(record.agreement_reached),
  };
}

function toFollowUpImage(record: RawRecord): FollowUpImage {
  return {
    uuid: stringValue(record.uuid),
    url: stringValue(record.url),
  };
}

function toFollowUpMeetPerson(record: RawRecord): FollowUpMeetPerson {
  return {
    uuid: stringValue(record.uuid),
    title: stringValue(record.title),
    name: stringValue(record.name),
    surname: stringValue(record.surname),
    phone: stringValue(record.phone),
    email: stringValue(record.email),
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
